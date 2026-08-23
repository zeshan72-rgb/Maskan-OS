# Maskan — backend handover

Read this before touching the code. It covers the decisions that aren't
obvious from reading files, the bugs already known, and the one thing that
must be done before real customer data goes anywhere near this.

---

## 1. What you're inheriting

| | |
| --- | --- |
| Framework | Next.js 16.3, React 19.2, TypeScript strict |
| Database | Supabase (Postgres 17) — project `hdlrwltxchdmnykogpkw` |
| Routes | 57 pages |
| Source files | 159 |
| Migrations | 17, all applied |
| Tables | 70 |
| RLS policies | 159 |
| DB functions | 17 |
| Triggers | 21 |
| Tests | 43 across 2 files |

`npm run typecheck` passes clean. `npm run test` passes. `npm run build`
succeeds.

There is also a **separate single-file HTML prototype** (~70 screens) that is
the design reference and product spec. It is ahead of this codebase in eight
modules — see section 8. When the prototype and this app disagree about a
workflow, the prototype is the intended behaviour.

---

## 2. The domain model, and why it's shaped this way

**This is the decision that matters most. Please don't undo it.**

Rent owed and money received are separate tables:

```
rent_instalments   what the tenant owes, and when
payments           money that actually arrived
payment_allocations  the join, with an amount per pairing
```

A `paid` boolean on the instalment would be simpler and would be wrong. In
Qatar, rent frequently arrives in fragments — QAR 5,700 against a QAR 9,500
instalment. That instalment is neither paid nor unpaid, it is **partial**, and
the tenant still owes 3,800.

`rent_instalments.outstanding_amount` is maintained by triggers
(`trg_apply_payment_allocation`, `trg_reverse_payment_allocation`), not by
application code. This is deliberate: the ledger stays correct regardless of
which path created the allocation — staff entry, cheque clearing, or a future
payment webhook. **Keep balance mutation in the database.**

### Cheques are a first-class entity, not a payment method

Post-dated cheques are how most Qatari rent is paid. A landlord holds twelve
per lease in a drawer. The lifecycle is enforced in Postgres by
`enforce_cheque_status_transition`:

```
received → stored → submitted → cleared
                          ↓
                       bounced → replaced
```

A cheque cannot go `received → cleared`. The trigger refuses it. When a cheque
clears, `clear_cheque_to_payment` creates the payment and the allocation —
do not reimplement this in TypeScript.

**A bounce does not clear the debt.** The instalment returns to outstanding and
the replacement cheque links back to the original. Getting this wrong loses
customer trust permanently.

### Lease status is also a guarded state machine

`enforce_lease_status_transition`. An expired lease cannot be silently
reactivated; `terminated` and `renewed` are terminal. A renewal creates a
successor lease rather than mutating the original.

---

## 3. Security model — read this twice

Two independent layers, by design:

1. **Application layer** — `lib/permissions/guards.ts`. `requireStaff()`,
   `assertPermission(orgId, key)`. Nine permission keys:
   `properties.manage`, `owners.manage`, `tenants.manage`, `leases.manage`,
   `payments.manage`, `maintenance.manage`, `vendors.manage`,
   `documents.manage`, `settings.manage`.

2. **Database layer** — RLS on every organisation-scoped table, using
   `is_org_member()`, `has_permission()`, `my_organisation_ids()`,
   `is_platform_super_admin()`.

The header of `0015_row_level_security.sql` states the intent: RLS is the
backstop, not the only line of defence. **If you add a table, add its policies
in the same migration.** A table without RLS is a cross-tenant leak.

### The service role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. It is required for platform
administration, webhooks and invitation acceptance. It must never be imported
into a client component or a route that a customer can reach. `lib/config/env.ts`
gates access to it server-side; keep it that way.

### ⚠ The gate before real data

**RLS has zero test coverage.** The state machines are well tested; the thing
that would end the company is not.

Before any real customer data enters this system, write tests that sign in as
Organisation A and attempt to read, update and delete Organisation B's
tenants, leases, payments, cheques and documents. Every attempt must fail at
the database, with the service role key absent. Also verify a tenant portal
session cannot reach another tenant's lease.

This is the single highest-value thing you can do in your first week.

---

## 4. Known bugs — found, reproduced, not yet fixed

**1. `validateManualAllocation` — duplicate instalment IDs bypass the cap.**
`features/payments/allocation.ts`. Money bug, live today.

```ts
validateManualAllocation(1000,
  [{ instalmentId: "A", amount: 500 }, { instalmentId: "A", amount: 500 }],
  [{ id: "A", outstanding_amount: 600 }])   // → passes, should reject
```

It validates each entry against the outstanding balance but never accumulates
per instalment. Fix: sum by `instalmentId` first, then compare.

**2. `planAllocation` does not sort.** Same file. The doc comment promises
"oldest due date first"; the function trusts caller ordering. The only current
caller does `.order("due_date")`, so it isn't wrong today — it's a trap for the
next caller. Fix: sort inside the function, or take a pre-sorted branded type.

**3. `nextReceiptNumber` races.** `count(*) + 1` under concurrency issues
duplicate receipt numbers. Fix: a Postgres sequence per organisation, or a
unique constraint plus retry.

**4. Payment and allocations are not written in one transaction.**
`features/payments/actions.ts` inserts the payment, then the allocations, as
two calls. A failure between them leaves money recorded against nothing. Fix:
move both into an RPC — the schema already has 17 functions, so this fits the
existing pattern.

**5. `parseAllocationsPayload` swallows parse errors,** returning `[]`. A
malformed manual allocation silently becomes "allocate nothing" instead of an
error the user can see.

**6. Money is stored in the app as `number`.** `round2()` mitigates float drift
and holds up over 300 instalments in testing, but Postgres `numeric` is exact
and JS float isn't. Consider minor units (fils) or decimal.js at the boundary.

Items 1–5 are roughly a day's work together.

---

## 5. Conventions in use

- **Server Actions**, not API routes, for mutations. Zod validation via
  `parseForm(schema, formData)`, returning a `FormState` the client renders.
- **`toSafeError()`** — raw database errors never reach the client. Keep this.
- **`recordAudit()`** on every state-changing action. `write_audit_log` is also
  available at the DB layer.
- **Generated types.** `types/database.ts` is currently hand-authored. Replace
  it with `supabase gen types typescript` output and wire that into CI.
- Feature-first layout: `features/<domain>/{queries,actions,components}`.
  Shared primitives in `components/ui`, cross-cutting logic in `lib`.
- `proxy.ts` is the Next 16 rename of `middleware.ts`.

---

## 6. Environment

```
NEXT_PUBLIC_SUPABASE_URL=https://hdlrwltxchdmnykogpkw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<from the Supabase dashboard — never committed>
NEXT_PUBLIC_APP_URL=https://maskan.qa
```

If Supabase env vars are absent the app redirects to `/setup` rather than
crashing. That's intentional for first-run.

**Note:** the anon key currently in circulation was shared during development.
Rotate it before production, along with anything else that has been pasted into
a chat, an email, or a ticket.

Schema install: `supabase/dist/full_schema.sql` (all 17 migrations concatenated)
or `reset_and_install.sql` to drop and rebuild. Demo data:
`supabase/seed/demo_seed.sql`.

---

## 7. Qatar-specific rules that are easy to get wrong

- **Currency is QAR throughout.** Amounts always carry the currency in the UI.
- **Dates are written `1 September 2026`,** never `01/09` — day-first and
  month-first ambiguity is a real support cost in a market this international.
- **QID and passport expiry** blocks lease registration. The compliance module
  tracks document readiness.
- **Maskan does not file anything with any government service.** It assembles a
  registration pack for the customer to submit. There is no Aqarat or QREP API
  and no public developer API exists as of August 2026. Do not let this claim
  drift into the product copy.
- **Arabic.** The schema carries locale fields and templates are keyed by
  language, but the translation catalogue is not written. RTL layout support
  exists in principle and has never been tested.

---

## 8. Built in the prototype, not yet in this codebase

The prototype ran ahead during design. These eight modules exist there and are
missing here:

**Buildings · Compliance · Migration centre · Bank reconciliation · Renewals ·
Ownership (percentage splits) · Opening balances · Roles editor**

Good news: the schema already has `buildings`, `property_owners` and
`unit_owners`, so building hierarchy and fractional ownership are
data-model-complete. This is UI and query work against tables that exist.

The **migration centre** is the hardest of these and the one that wins deals.
It must reconcile the customer's old-system totals against what Maskan
calculated — arrears, deposits, cheque counts, owner balances — and refuse to
finalise while they disagree. Rollback must remain available until commit.

---

## 9. Deliberately not built

Do not assume these are missing by accident:

- Payment gateway. `app/api/webhooks/payments` is scaffolded only.
- Email and WhatsApp providers. Invitations currently produce a shareable link.
- File storage. `0016_storage.sql` exists; buckets and signed URLs are not
  wired. Documents are core to compliance, so this is high priority.
- Any government integration.

The rule the product has followed throughout: **never report something as sent,
charged or filed when it wasn't.** When a provider is absent the surrounding
workflow still works — payments can be recorded manually, invitations produce a
link. Please keep that discipline.

---

## 10. Suggested first two weeks

1. Set env vars, deploy, click every screen against the seeded database. Hours,
   not days — and it replaces guesswork with a real defect list.
2. Write the cross-tenant RLS tests. Section 3.
3. Fix the six bugs in section 4, with regression tests.
4. Replace hand-authored `types/database.ts` with generated types in CI.
5. Wire storage buckets and signed URLs.
6. Then, and only then, start on the eight missing modules.

Questions worth asking early: where the data is hosted and whether Qatar
residency rules apply to tenant QID copies; and what contractual promise is
being made about a ledger of someone's rent arrears. Both are lawyer questions,
not engineering ones, and both are cheaper to answer before a pilot than after.
