# Quickstart — deploy from your laptop

No GitHub account needed. Vercel's CLI uploads your local folder directly.

> **A note on expectations:** Vercel has no drag-and-drop upload in its
> dashboard (that's Netlify). The CLI below is the equivalent — one command
> from the unpacked folder. And because RentOS is database-backed, deploying
> the code is only half the job: without Supabase it will deploy successfully
> and show you a setup screen explaining what's still missing. That's by
> design, not a failure.

---

## The short version

```bash
# 1. Unpack and install
unzip rentos.zip && cd rentos
npm install

# 2. Deploy
npx vercel
```

Answer the prompts (`Set up and deploy? Y` → scope → project name → accept the
detected settings). You'll get a preview URL in about two minutes.

Visit it. You'll see the **setup screen**, because there's no database yet.

---

## Now give it a database

### 1. Create the Supabase project

[supabase.com](https://supabase.com) → **New project**. Region **Frankfurt
(eu-central-1)** is the best latency from Qatar.

When it's ready, go to **Project Settings → API** and keep three values to hand:

- Project URL
- `anon` `public` key
- `service_role` `secret` key

### 2. Create the schema

Supabase → **SQL Editor → New query** → paste the whole of
`supabase/dist/full_schema.sql` → **Run**.

That's all 17 migrations at once: tables, indexes, constraints, row-level
security, storage buckets, triggers and reference data. Expect
`Success. No rows returned.`

**Optional demo data** — a second query with `supabase/seed/demo_seed.sql`
gives you 5 properties, 54 units, ~35 occupied, leases, cheques (one bounced),
maintenance and seven logins, all with password `Passw0rd!2026`. Great for a
walkthrough; never use it on a database holding real records.

### 3. Add the environment variables

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add NEXT_PUBLIC_APP_URL
```

Each prompts for the value and which environments to apply it to — select
**all three** (Production, Preview, Development) with the spacebar.

For `NEXT_PUBLIC_APP_URL`, use the URL from step 2 of the short version.

Or do the same thing in the dashboard: **Settings → Environment Variables**.

### 4. Deploy to production

```bash
npx vercel --prod
```

Environment variables are read **at build time**, so a redeploy is required —
refreshing the page won't pick them up. This is the single most common thing
people get caught by.

### 5. Point Supabase Auth at your domain

Supabase → **Authentication → URL Configuration**:

- **Site URL**: your production URL
- **Redirect URLs**: add `<your-url>/reset-password`

Skipping this doesn't break sign-in, but password-reset links will land on the
wrong page.

---

## Create your first login

There's deliberately no public sign-up page — account creation is
invitation-only so nobody can self-provision as an organisation administrator.
The very first account is therefore made by hand.

**If you loaded the demo seed**, skip this and sign in as
`admin@pearlpm.qa` / `Passw0rd!2026` (or `superadmin@rentos.qa` for `/admin`).

**If you started clean:**

1. Supabase → **Authentication → Users → Add user**. Use your real email, set a
   password, tick **Auto Confirm User**.
2. Copy the new user's **UID**.
3. SQL Editor:

   ```sql
   insert into profiles (id, full_name, email, is_platform_super_admin)
   values ('PASTE-UID-HERE', 'Your Name', 'you@example.com', true);
   ```

4. Sign in → you'll land on `/no-organisation` → **Create an organisation** →
   the onboarding wizard.

---

## Prove it's actually working

Five clicks, in this order:

1. **Dashboard loads with numbers.** Seeded → occupancy and collection rate.
   Clean → empty states, which is correct, not broken.
2. **Create a property** at `/properties/new`. If it saves, your anon key and
   RLS policies are both good.
3. **Press ⌘K**, search for it. Proves the server-side search path works.
4. **Record a partial payment** on a lease — enter *less* than the instalment
   owes. It should go **Partial**, not Paid, with the balance reduced by
   exactly what you entered. This is the real test: it proves the allocation
   triggers installed correctly.
5. **Sign in as a tenant** (`tenant@pearlpm.qa` if seeded). You should land on
   `/tenant`, not the manager dashboard.

If step 4 marks it Paid instead of Partial, the triggers didn't install —
re-run the `0009_payments.sql` section of `full_schema.sql`.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Setup screen persists after adding variables | You didn't redeploy. Run `npx vercel --prod` again. |
| "Invalid API key" | Keys pasted with whitespace, or the anon/service-role keys swapped. |
| Sign in works, everything is empty | Missing `profiles` row — see "Create your first login". |
| "row-level security policy" errors when saving | Schema didn't fully apply, or your member has no role in `member_roles`. |
| Reset emails land on a broken page | Step 5 not done. |

---

## Running it locally first

If you'd rather see it work before deploying:

```bash
cp .env.example .env.local     # fill in the same four values
npm run dev                    # http://localhost:3000
```

Everything above applies identically, with `NEXT_PUBLIC_APP_URL` set to
`http://localhost:3000`.
