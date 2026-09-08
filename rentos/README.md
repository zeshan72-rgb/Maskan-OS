# RentOS

A multi-tenant rental-property operating system for Qatar. RentOS manages the
full lifecycle — organisation → owner → property → unit → tenant → lease →
rent → payment → reconciliation → maintenance → owner reporting → renewal —
across a manager application and three self-service portals.

The product name and all branding tokens live in `lib/config/app.ts`, so
renaming is a single-file change.

---

## Contents

1. [Architecture](#architecture)
2. [Requirements](#requirements)
3. [Local setup](#local-setup)
4. [Supabase setup](#supabase-setup)
5. [Environment variables](#environment-variables)
6. [Migrations](#migrations)
7. [Seeding](#seeding)
8. [Running locally](#running-locally)
9. [Testing](#testing)
10. [Deployment (Vercel)](#deployment-vercel)
11. [Payment provider integration](#payment-provider-integration)
12. [Email integration](#email-integration)
13. [Known limitations](#known-limitations)

---

## Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth via `@supabase/ssr` |
| Storage | Supabase Storage (all buckets private) |
| Tests | Vitest |

### Directory layout

```
app/
  (auth)/          sign-in, forgot/reset password, invitation acceptance
  (app)/           manager application — dashboard, properties, leases, finance…
  admin/           platform super-admin area (dark chrome, elevated access)
  tenant/          tenant portal   (mobile-first)
  owner/           owner portal
  vendor/          vendor portal   (mobile-first)
  onboarding/      guided organisation setup
components/
  ui/              primitives (button, input, table, dialog, tabs…)
  layout/          sidebar, topbar, portal shell, admin shell
  shared/          page header, stat card, table toolbar, empty state…
features/          one folder per domain: queries.ts, actions.ts, components/
lib/
  supabase/        browser / server / admin clients, session proxy
  permissions/     session context, route guards, error types
  validation/      Zod schemas
  utils/           formatting, form state, audit helper
supabase/
  migrations/      17 ordered SQL migrations (schema, RLS, storage, reference data)
  seed/            demo_seed.sql — fictional data, never run in production
tests/             business-rule tests
```

### Separation of concerns

- **Data access** lives in `features/*/queries.ts` — read-only, server-side.
- **Business logic** lives in `features/*/actions.ts` (server actions) and in
  SQL functions/triggers for invariants that must hold regardless of caller.
- **UI** components never talk to the database directly.
- **Validation** is Zod schemas in `lib/validation`, shared by forms and actions.
- **Permissions** are checked twice: once in the application layer for clear
  error messages, and again by PostgreSQL RLS as the actual enforcement.

### Key design decisions

**Rent obligations and payments are separate records.** A `rent_instalment` is
what's owed; a `payment` is money received. They're joined by
`payment_allocations`. Database triggers on that join table adjust each
instalment's `outstanding_amount` and recompute its status. This is what makes
partial payments work correctly: QAR 6,000 against a QAR 10,000 instalment
leaves it `partial` with 4,000 outstanding, and a later 4,000 payment flips it
to `paid` — no boolean "is paid" flag anywhere.

**State machines live in the database.** `enforce_lease_status_transition` and
`enforce_cheque_status_transition` reject impossible transitions (an expired
lease can't silently become active; a cheque can't clear without being
submitted) no matter which code path attempts them.

**Rent schedules are generated at activation, not at draft.** A draft lease
creates no financial obligations. `generate_rent_schedule()` runs when the
lease is activated and raises if a schedule already exists, so repeated
activation attempts can't duplicate rent.

**Elevated access is explicit.** Platform administration uses the service-role
client, which bypasses RLS — so it's confined to `features/admin/*`, every
function is called only from routes behind `requirePlatformSuperAdmin()`, and
the admin area has visibly different chrome. `is_platform_super_admin` can only
be set directly in the database; it can never be granted through an
organisation invitation.

**Financial records are archived, never deleted.** Properties, tenants and
leases use `archived_at`. Terminating a lease preserves outstanding balances —
it doesn't erase what a tenant owes.

---

## Requirements

- Node.js 20+
- npm 10+
- A Supabase project (free tier is fine)
- Optionally the [Supabase CLI](https://supabase.com/docs/guides/cli) for local development

---

## Local setup

```bash
git clone <your-repo-url> rentos
cd rentos
npm install
cp .env.example .env.local   # then fill in the values below
```

---

## Supabase setup

Exactly what you need to create:

1. **Create a project** at [supabase.com](https://supabase.com). Pick a region
   close to your users (Frankfurt or Singapore are the nearest to Qatar).

2. **Collect three keys** from *Project Settings → API*:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never
     expose this to the browser)

3. **Run the migrations** (see below). These create every table, index, RLS
   policy, storage bucket and the reference data the app needs.

4. **Storage buckets** are created by `0016_storage.sql`. All ten are private:
   `property-documents`, `tenant-documents`, `lease-documents`,
   `payment-evidence`, `cheque-images`, `maintenance-media`,
   `vendor-documents`, `owner-statements`, `receipts`, `branding`.
   Files are addressed as `{organisation_id}/{entity}/{entity_id}/{filename}`
   so the storage policy can scope reads by the first path segment.

5. **Auth settings** — under *Authentication → URL Configuration*, set the Site
   URL to your deployed domain and add `<domain>/reset-password` to the
   redirect allow-list, so password-reset emails land on the right page.

6. **Create your first platform administrator.** There's deliberately no UI for
   this. Sign up (or accept an invitation), then run in the SQL editor:

   ```sql
   update profiles set is_platform_super_admin = true
   where email = 'you@yourcompany.com';
   ```

---

## Environment variables

Copy `.env.example` to `.env.local`. Required values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only; webhooks, admin area, seeding |
| `NEXT_PUBLIC_APP_URL` | yes | Used in invitation and reset links |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | no | Transactional email |
| `PAYMENT_PROVIDER` / `PAYMENT_PROVIDER_API_KEY` / `PAYMENT_PROVIDER_WEBHOOK_SECRET` | no | Online payments |
| `WHATSAPP_PROVIDER_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | no | WhatsApp Business API |

The app degrades honestly without the optional ones: it shows "not configured"
and never simulates a send or a charge.

---

## Migrations

Seventeen ordered files in `supabase/migrations/`:

| File | Contents |
| --- | --- |
| `0001` | Extensions, enums, shared trigger functions |
| `0002` | Identity: profiles, organisations, members, roles, permissions, invitations + RLS helper functions |
| `0003` | Plans and subscriptions |
| `0004` | Owners, contacts, bank accounts |
| `0005` | Properties, buildings, units, ownership mapping |
| `0006` | Tenants, contacts, documents, occupants |
| `0007` | Leases, parties, documents, events, renewal offers + status-transition trigger |
| `0008` | Rent schedules, instalments, charges, credits + `generate_rent_schedule()` |
| `0009` | Payments, allocations, evidence, provider events, receipts + allocation triggers |
| `0010` | Cheques, events, images + transition trigger and `clear_cheque_to_payment()` |
| `0011` | Maintenance requests, comments, attachments, work orders |
| `0012` | Vendors, members, documents, invoices |
| `0013` | Expenses, management fees, owner transactions and statements |
| `0014` | Notifications, communications, documents, templates, audit, feature flags, integrations |
| `0015` | **Row Level Security** — enablement and policies for every table |
| `0016` | Storage buckets and policies |
| `0017` | Reference data: permissions, system roles, plans, categories, sample lease template |

### Applying them

**With the Supabase CLI (recommended):**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Or by hand:** paste each file into the SQL editor in numeric order. Order
matters — later files depend on types and tables from earlier ones.

### Regenerating types

`types/database.ts` is hand-authored to match the migrations. Once your project
is live, replace it with the generated version:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.ts
```

---

## Seeding

`supabase/seed/demo_seed.sql` creates the **Pearl Property Management** demo
organisation: 5 properties, 54 units, ~35 occupied, multiple owners, tenants,
active leases with monthly and quarterly schedules, paid/partial/overdue rent,
post-dated cheques including one deliberately bounced, bank transfers,
maintenance requests, vendors, expenses and notifications.

```bash
# Local Supabase
supabase db reset          # applies migrations, then the seed

# Remote project
psql "$DATABASE_URL" -f supabase/seed/demo_seed.sql
```

**Never run this against production.** It's kept out of `supabase/migrations/`
precisely so `supabase db push` can't apply it by accident.

### Demo credentials

The seed creates auth users directly. Password for all of them:
`Passw0rd!2026`

| Email | Role |
| --- | --- |
| `superadmin@rentos.qa` | Platform super admin → `/admin` |
| `admin@pearlpm.qa` | Organisation admin → `/dashboard` |
| `manager@pearlpm.qa` | Property manager + maintenance manager |
| `accountant@pearlpm.qa` | Accountant (payments, cheques, statements) |
| `owner@pearlpm.qa` | Property owner → `/owner` |
| `tenant@pearlpm.qa` | Tenant → `/tenant` |
| `vendor@pearlpm.qa` | Vendor → `/vendor` |

If your Supabase instance rejects direct `auth.users` inserts, create these
seven accounts through the sign-up flow instead, then re-run the seed with the
`auth.users` insert block removed — the rest of the script looks profiles up by
email.

---

## Running locally

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
```

---

## Testing

`npm test` runs 43 tests covering the rules the business depends on most:

- **Payment allocation** — partial payments, multi-instalment spreading,
  overpayment reported as unallocated rather than over-applied, floating-point
  safety, manual-allocation validation
- **Rent schedule generation** — instalment counts and amounts across monthly,
  quarterly, semi-annual and annual frequencies; equal totals regardless
- **Overdue derivation** — computed from due date and remaining balance
- **Lease status transitions** — terminated and renewed are final; an expired
  lease can't be silently reactivated
- **Cheque progression** — happy path, bounce/replace path, and refusal to
  clear a cheque never submitted to the bank
- **Organisation isolation** — permissions don't leak across organisations, and
  super-admin access requires the explicit flag
- **Role-based routing** — each portal role lands in its own namespace

RLS itself is enforced by PostgreSQL and is best verified against a live
project: sign in as `tenant@pearlpm.qa` and request another tenant's lease ID,
or as `vendor@pearlpm.qa` and request an unassigned work order. Both return
empty rather than data.

---

## Deployment (Vercel)

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import it. The framework preset is
   detected automatically; no build-command overrides are needed.
3. Add all environment variables under *Settings → Environment Variables*
   (Production, Preview and Development). `SUPABASE_SERVICE_ROLE_KEY` must
   **not** be prefixed with `NEXT_PUBLIC_`.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain.
5. Deploy. Then in Supabase, update *Authentication → URL Configuration* with
   the production domain and add `<domain>/reset-password` to the redirect
   allow-list.
6. If you're wiring up a payment provider, point its webhook at
   `https://<domain>/api/webhooks/payments`.

The architecture is serverless-compatible throughout: no long-running
processes, no filesystem writes, no in-memory caches shared across requests.

---

## Payment provider integration

**Working today, with no credentials:** post-dated cheques end to end, bank
transfers with tenant-submitted proof and accountant verification, cash and
manual payments, allocation across instalments, partial payments, receipt
numbering, and reconciliation against outstanding rent.

**Built but awaiting credentials:** the online-payment path. In place are the
provider abstraction, the `payment_provider_events` table with a unique
`(provider, event_id)` constraint for idempotency, the webhook route, and the
signature-verification seam.

To activate a provider (SkipCash, Stripe, Tap, Dibsy — whichever you choose):

1. Implement the provider interface — `createPayment`, `getPaymentStatus`,
   `refundPayment`, `verifyWebhook`.
2. Set `PAYMENT_PROVIDER`, `PAYMENT_PROVIDER_API_KEY` and
   `PAYMENT_PROVIDER_WEBHOOK_SECRET`.
3. Register the webhook URL with the provider.

Until then the settings page reports "Awaiting credentials" and the tenant
portal doesn't offer card payment. **No payment success is ever simulated.**

---

## Email integration

Invitations, password resets, receipts, reminders and renewal offers are all
modelled, and `communication_logs` records every send with its channel,
recipient and provider message ID.

Without `RESEND_API_KEY`, nothing is faked: inviting a team member returns a
copyable invitation link instead of claiming an email was sent. Supabase Auth
handles password-reset emails independently through its own SMTP settings.

WhatsApp is modelled as a channel throughout (`notification_channel` enum,
`communication_logs`), ready for the official Business API.

---

## Known limitations

Stated plainly rather than hidden:

1. **Online payments are not live.** The provider abstraction, webhook endpoint
   and idempotency layer exist; a provider implementation and credentials do not.
2. **Email and WhatsApp are not live** without credentials. In-app
   notifications work regardless.
3. **PDF generation is not implemented.** Receipts and owner statements are
   fully computed and stored as data, and the `receipts` / `owner_statements`
   tables carry `storage_path` columns for the generated files. Rendering to PDF
   (e.g. React-PDF or a headless-Chrome service) is the remaining step.
4. **Arabic translations are not written.** The architecture supports them —
   locale columns on organisations and profiles, RTL-aware layout, no hardcoded
   strings baked into logic, `document_templates` keyed by locale — but the
   translation catalogue itself is English-only today.
5. **File uploads use the schema and buckets but have no upload UI yet.** All
   document tables and storage policies are in place; the widgets that write to
   them are not built.
6. **`types/database.ts` is hand-authored.** Regenerate it with the Supabase CLI
   once your project is live so it can never drift from the schema.
7. **The bundled lease template is a sample, clearly marked as such.** It is not
   a lawyer-approved contract and shouldn't be used as one.
8. **Fonts use a system stack.** `next/font/google` works fine on Vercel; the
   system stack was chosen so builds succeed in network-restricted environments.
   To use Inter, add it in `app/layout.tsx` and prepend `var(--font-inter)` in
   `app/globals.css`.
9. **Custom roles are modelled but have no builder UI.** The schema supports
   per-organisation roles with arbitrary permission sets; creating them today
   means inserting rows.

---

## Security notes

- RLS is enabled on every table, with organisation isolation plus self-scoped
  policies for tenant, owner and vendor portals.
- The service-role key is never imported into a client component;
  `createAdminClient()` throws if called in the browser.
- Bank account numbers are masked **server-side** for roles without
  `finance.bank_details.view`, so the real value never reaches the browser.
- `platform_super_admin` cannot be granted through an organisation invitation.
- Every mutating action writes an audit entry (actor, organisation, action,
  entity, timestamp, metadata) — with bank numbers deliberately excluded from
  the metadata.
- Errors are sanitised before reaching the client; raw Postgres errors are
  logged server-side only.
