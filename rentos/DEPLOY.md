# Deploying RentOS

Roughly 20 minutes end to end. You need a GitHub account, a Supabase account
and a Vercel account — all free tiers are sufficient.

Work through this in order. Every step you need to do personally is marked
**YOU**, and every value you'll need to copy is called out explicitly.

---

## Step 1 — Create the Supabase project (5 min)

**YOU:**

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name it whatever you like. Set a strong database password and **save it** —
   you'll want it if you ever connect with `psql`.
3. Region: pick **Frankfurt (eu-central-1)** or **Singapore (ap-southeast-1)**.
   Both are reasonable from Qatar; Frankfurt usually wins on latency.
4. Wait for provisioning (~2 minutes).

Then go to **Project Settings → API** and copy these three values into a
scratch file. You'll paste them into Vercel in step 4.

| Label in Supabase | Copy it to |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses all row-level security. Never put it in a
> variable name starting with `NEXT_PUBLIC_`, and never paste it into
> client-side code.

---

## Step 2 — Create the database schema (2 min)

**YOU:**

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/dist/full_schema.sql` from this repo, select all, copy.
3. Paste into the editor and press **Run**.

That's all 17 migrations in one shot: every table, index, constraint, RLS
policy, storage bucket, trigger and the reference data (permissions, system
roles, subscription plans, categories).

Expected result: `Success. No rows returned.` It takes a few seconds.

**If you see an error**, note which `-- SOURCE:` block it came from — the file
is annotated with the original migration filename above each section, so you
can find the failing statement quickly.

### Optional: load the demo portfolio

If you want a populated app to click through rather than an empty one:

**SQL Editor → New query** → paste `supabase/seed/demo_seed.sql` → **Run**.

This creates Pearl Property Management: 5 properties, 54 units, ~35 occupied,
owners, tenants, leases, cheques (including one bounced), maintenance and
expenses — plus seven demo logins, all with the password `Passw0rd!2026`.

**Don't do this on a database you intend to use for real.** It's fictional data
and the accounts have a published password.

---

## Step 3 — Push to GitHub (2 min)

**YOU:**

```bash
cd rentos
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next` and `.env*` — verify
nothing sensitive is staged before you push:

```bash
git status --short | grep -i env    # should print nothing
```

---

## Step 4 — Deploy on Vercel (5 min)

**YOU:**

1. [vercel.com](https://vercel.com) → **Add New → Project** → import your repo.
2. Leave the framework preset and build settings alone — Next.js is detected
   and no overrides are needed.
3. Expand **Environment Variables** and add these four, ticking **Production**,
   **Preview** and **Development** for each:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` |

   You won't know the final URL until after the first deploy. Put a placeholder
   in `NEXT_PUBLIC_APP_URL`, deploy, then come back and correct it — it's only
   used to build invitation and password-reset links.

4. **Deploy.** First build takes 2–3 minutes.

---

## Step 5 — Point Supabase Auth at your domain (1 min)

Password-reset and invitation links break without this.

**YOU:** Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-project>.vercel.app`
- **Redirect URLs**: add `https://<your-project>.vercel.app/reset-password`

Then in Vercel, correct `NEXT_PUBLIC_APP_URL` if you used a placeholder, and
redeploy (**Deployments → ⋯ → Redeploy**).

---

## Step 6 — Create your first account (3 min)

There is deliberately **no public sign-up page**. Account creation is
invitation-only by design, so nobody can self-provision as an organisation
administrator. That means the very first account is created by hand.

**If you loaded the demo seed:** skip this — sign in as `admin@pearlpm.qa`
with `Passw0rd!2026`, or `superadmin@rentos.qa` for the platform admin area.

**If you started clean:**

1. Supabase → **Authentication → Users → Add user**
   - Email: your real email
   - Password: something strong
   - Tick **Auto Confirm User**
2. Copy the new user's **UID**.
3. **SQL Editor → New query**, substituting your values:

   ```sql
   insert into profiles (id, full_name, email, is_platform_super_admin)
   values ('PASTE-UID-HERE', 'Your Name', 'you@example.com', true);
   ```

   The `true` makes you a platform super admin, which gives you `/admin`. Set it
   to `false` if you only want an ordinary organisation account.

4. Visit your Vercel URL → **Sign in** → you'll land on `/no-organisation` →
   **Create an organisation** → the onboarding wizard walks you through
   properties, team, bank details and import.

---

## Verifying it actually works

Sign in and check these in order — they exercise the parts most likely to
break in a fresh environment:

1. **Dashboard loads with real numbers.** If you seeded, you'll see occupancy,
   collection rate and alerts. Empty database → empty states, which is correct.
2. **Create a property** (`/properties/new`). If this saves, your anon key and
   RLS policies are both working.
3. **Press ⌘K** and search for the property you just made. This proves the
   server-action search path works.
4. **Record a partial payment** on any lease. Enter less than the instalment
   owes — it should go **Partial**, not Paid. This proves the allocation
   triggers fired correctly during schema creation.
5. **Sign in as a tenant** (seeded: `tenant@pearlpm.qa`). You should land on
   `/tenant`, not the manager dashboard. This proves role-based routing.

If step 4 misbehaves, the allocation triggers didn't install — re-run the
`0009_payments.sql` section of the schema file.

---

## Common problems

**"Invalid API key" or a redirect loop at sign-in**
Environment variables are missing or wrong in Vercel. They're read at build
time, so after fixing them you must **redeploy**, not just refresh.

**Sign-in succeeds, then everything is empty**
Your `profiles` row is missing. Auth users and profiles are separate tables —
step 6 creates the profile.

**"row-level security policy" errors on save**
The `0015_row_level_security.sql` section didn't apply, or your account has no
role assigned. Check `member_roles` has a row for your `organisation_members`
entry.

**Password-reset emails land on a broken page**
Step 5 wasn't done, or was done before the final URL was known.

---

## What still needs credentials

None of these block deployment; the app runs and reports them honestly as
unconfigured rather than pretending they work:

- **Online card payments** — add `PAYMENT_PROVIDER`,
  `PAYMENT_PROVIDER_API_KEY`, `PAYMENT_PROVIDER_WEBHOOK_SECRET`, then implement
  the provider interface and point its webhook at
  `https://<domain>/api/webhooks/payments`.
- **Transactional email** — add `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`.
  Until then, inviting a team member gives you a copyable link instead of
  claiming an email was sent.
- **WhatsApp** — add the `WHATSAPP_*` variables.

Cheques, bank transfers, cash and manual payments all work fully today without
any of this.
