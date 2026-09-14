# Prototype coverage checklist

Every route in `maskan-v2.html`, against what exists in the Next.js app.
Regenerate with `tools/inventory.md` as the reference.

**59 of 99 built. 40 remaining.**

> Slice 1a, portfolio and letting, is in. Six screens are wired to real
> queries. Four read stub data because this schema has no `leads`,
> `offers`, `viewings` or `brokers` table; each is marked on screen and
> points at `features/leasing/stub-data.ts`, which describes the
> migration it needs.
>
> Slice 1b (money) is also in: ledger, outstanding, record-payment,
> take-payment, statements and expenses are wired to real queries.
> reconciliation and opening-balances read
> `features/finance/stub-data.ts`; this schema has no bank_transactions,
> reconciliation_sessions or opening_balances table.
>
> The owner portal is complete: all 10 screens. Seven read real data;
> owner-mandate and owner-offers are stubs, because there is no
> `mandates` or `offers` table. See `features/portals/owner-stub-data.ts`.
>
> The tenant portal is complete: all 7 screens. Five read real data.
> tenant-msg shows real notifications but stubbed conversations, because
> there is no `messages` or `conversations` table. See
> `features/portals/tenant-stub-data.ts`.

| Role | Built | Remaining |
| --- | --- | --- |
| Staff and operator | 13 | 45 |
| Owner portal | 1 | 9 |
| Tenant portal | 1 | 6 |
| Contractor portal | 1 | 3 |
| Platform admin | 1 | 10 |
| Auth and onboarding | 9 | 0 |

## Staff and operator

| Prototype route | Contains | Status |
| --- | --- | --- |
| `dashboard` | 9 stat cards, 61 cards | built, `/dashboard` |
| `roles` | 2 tables, 3 cards, 1 modal | **missing** |
| `reconciliation` | 4 stat cards, 7 cards, 1 modal | built, `/reconciliation`, **stub data** |
| `offer` | 10 cards, 1 modal | built, `/offers/builder`, **stub data** |
| `leasing` | 4 stat cards, 7 cards, 1 modal | built, `/leasing`, **stub data** |
| `departments` | 4 stat cards, 4 cards, 1 modal | **missing** |
| `buildings` | 1 table, 4 stat cards, 1 modal | built, `/buildings` |
| `record-payment` | 14 cards | built, `/record-payment` |
| `subscription` | 4 stat cards, 13 cards, 2 modals | **missing** |
| `movein-track` | 1 table, 4 stat cards, 5 cards | **missing** |
| `leases` | 1 table | built, `/leases` |
| `movein` | 7 cards | **missing** |
| `fees` | 1 table, 4 stat cards, 5 cards, 1 modal | **missing** |
| `documents` | 1 table, 1 cards, 1 modal | **missing** |
| `finance` | 7 stat cards, 18 cards | built, `/finance` |
| `maintenance` | 1 table, 4 stat cards, 1 cards, 1 modal | built, `/maintenance` |
| `lease` | 1 table, 4 stat cards, 2 cards, 4 modals | built, `/leases/[id]` |
| `mandate` | 4 stat cards, 14 cards, 1 modal | **missing** |
| `undertaking` | 4 stat cards, 16 cards, 2 modals | **missing** |
| `today` | 5 cards | built, `/dashboard` |
| `payments` | 1 table, 3 modals | built, `/payments` |
| `property` | 1 table, 4 stat cards, 4 cards, 2 modals | built, `/properties/[id]` |
| `units` | 1 table, 1 modal | built, `/units` |
| `contract` | 4 stat cards, 8 cards, 2 modals | **missing** |
| `compliance` | 1 table, 4 stat cards | **missing** |
| `undertakings` | 1 table, 4 stat cards, 1 cards, 1 modal | **missing** |
| `properties` | 1 table, 2 cards, 1 modal | built, `/properties` |
| `building` | 5 stat cards, 9 cards, 3 modals | built, `/buildings/[id]` |
| `tenants` | 1 table, 1 modal | built, `/tenants` |
| `ledger` | 2 tables, 4 stat cards, 1 cards | built, `/ledger` |
| `compliance-detail` | 12 cards, 2 modals | **missing** |
| `mandates` | 1 table, 4 stat cards, 1 cards, 1 modal | **missing** |
| `maint-detail` | 15 cards, 1 modal | **missing** |
| `vacancy` | 1 table, 4 stat cards, 1 modal | built, `/vacancy` |
| `contracts` | 1 table, 4 stat cards, 1 modal | **missing** |
| `outstanding` | 1 table, 5 stat cards | built, `/outstanding` |
| `cheques` | 1 table, 2 modals | built, `/payments/cheques` |
| `offers` | 1 table, 4 stat cards, 1 modal | built, `/offers`, **stub data** |
| `expenses` | 1 table, 1 modal | built, `/expenses` |
| `owners` | 1 table, 3 cards, 1 modal | built, `/owners` |
| `templates` | 1 table, 1 cards, 2 modals | **missing** |
| `brokers` | 1 table, 4 stat cards, 1 modal | **missing** |
| `renewals` | 1 table, 4 stat cards, 1 modal | **missing** |
| `lead` | 4 stat cards, 12 cards, 3 modals | built, `/leasing/[id]`, **stub data** |
| `statements` | 1 table, 1 cards, 1 modal | built, `/statements` |
| `unit` | 5 stat cards, 9 cards, 2 modals | built, `/units/[id]` |
| `take-payment` | 1 cards | built, `/take-payment` |
| `opening-balances` | 1 table, 4 stat cards, 1 cards | built, `/opening-balances`, **stub data** |
| `reports` | 1 table, 4 stat cards | built, `/reports` |
| `cheque` | 14 cards, 1 modal | **missing** |
| `broker` | 1 table, 4 stat cards, 6 cards, 1 modal | **missing** |
| `settings` | 2 tables, 1 modal | built, `/settings` |
| `migration` | 5 cards | **missing** |
| `import` | 5 cards | **missing** |
| `lease-new` | 5 cards | **missing** |
| `owner-detail` | 1 table, 4 stat cards | **missing** |
| `tenant-detail` | 1 table, 4 stat cards | **missing** |
| `vendors` | 1 table | **missing** |

## Owner portal

| Prototype route | Contains | Status |
| --- | --- | --- |
| `owner` | 4 stat cards, 27 cards | built, `/owner` |
| `ownership` | 1 table, 4 stat cards, 3 cards, 1 modal | built, `/owner/ownership` |
| `owner-mandate` | 4 stat cards, 9 cards | built, `/owner/mandate`, **stub data** |
| `owner-docs` | 6 cards | built, `/owner/documents` |
| `owner-offers` | 1 table, 1 cards, 2 modals | built, `/owner/offers`, **stub data** |
| `owner-vacancy` | 3 stat cards | built, `/owner/vacancy` |
| `owner-fin` | 10 cards | built, `/owner/finance` |
| `owner-stmt` | 10 cards | built, `/owner/statements` |
| `owner-maint` | 3 cards | built, `/owner/maintenance` |
| `owner-props` | 1 cards | built, `/owner/properties` |

## Tenant portal

| Prototype route | Contains | Status |
| --- | --- | --- |
| `tenant-pay` | 24 cards, 1 modal | built, `/tenant/rent` |
| `tenant` | 11 cards, 1 modal | built, `/tenant` |
| `tenant-lease` | 13 cards | built, `/tenant/lease` |
| `tenant-docs` | 5 cards | built, `/tenant/documents` |
| `tenant-msg` | 3 cards | built, `/tenant/messages`, **stub conversations** |
| `tenant-contract` | 7 cards, 1 modal | built, `/tenant/contract` |
| `tenant-maint` | 2 cards, 1 modal | built, `/tenant/maintenance` |

## Contractor portal

| Prototype route | Contains | Status |
| --- | --- | --- |
| `vendor` | 18 cards, 2 modals | built, `/vendor` |
| `vendor-done` | 23 cards | **missing** |
| `vendor-job` | 1 table, 20 cards, 2 modals | **missing** |
| `vendor-terms` | 4 stat cards, 6 cards | **missing** |

## Platform admin

| Prototype route | Contains | Status |
| --- | --- | --- |
| `admin` | 9 stat cards, 42 cards | built, `/admin` |
| `admin-org` | 8 stat cards, 33 cards, 1 modal | **missing** |
| `admin-plans` | 4 cards | **missing** |
| `admin-int` | 10 cards | **missing** |
| `admin-market` | 1 table, 4 stat cards, 1 cards | **missing** |
| `admin-settings` | 6 cards | **missing** |
| `admin-orgs` | 1 table | **missing** |
| `admin-audit` | 1 table | **missing** |
| `admin-subs` | 1 table | **missing** |
| `admin-users` | 1 table | **missing** |
| `admin-support` | 1 table | **missing** |

## Auth and onboarding

| Prototype route | Contains | Status |
| --- | --- | --- |
| `onboarding` | 5 cards | built, `/setup` |
| `signin` | 1 cards | built, `/sign-in` |
| `auth-invite-vendor` | 1 cards | built, `/invite/[token]` |
| `auth-invite` | 1 cards | built, `/invite/[token]` |
| `auth-invite-owner` | 1 cards | built, `/invite/[token]` |
| `auth-invite-tenant` | 1 cards | built, `/invite/[token]` |
| `auth-forgot` | 1 cards | built, `/forgot-password` |
| `auth-create` | 1 cards | built, `/sign-in` |
| `auth-reset` | 1 cards | built, `/reset-password` |
