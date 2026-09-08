# Recovery manifest

Rebuilt from two build transcripts. Read-only against `/mnt/transcripts`;
written only to `recovery/rentos`.

## Headline

- **110 files recovered**, 20,029 lines, 960 KB
- **99 belong to the Next.js app**; 11 are the old HTML demo and docs
- **0 files show any sign of truncation** (brace, paren, backtick, JSON and SQL terminator checks all clean)

## Against the handover's claims

| Claim | Handover | Recovered | Verdict |
| --- | --- | --- | --- |
| Source files | 159 | 99 | **partial, 62%** |
| Migrations | 17 | 17 | **complete** |
| Tests | 43 tests | 2 files | see below |
| Tables | 70 | not verifiable from files alone | schema is in the migrations |
| RLS policies | 159 | in `0015_row_level_security.sql` (565 lines) | file present |

## What came back, by area

| Area | Files |
| --- | --- |
| `features` | 45 |
| `database` | 18 |
| `lib` | 15 |
| `routes` | 9 |
| `components` | 8 |
| `tests` | 2 |
| `root` | 1 |
| `types` | 1 |

## The database is fully intact

All seventeen migrations, in order, none truncated:

```
0001_extensions_and_helpers.sql                    85 lines
0002_identity.sql                                 172 lines
0003_subscriptions.sql                             42 lines
0004_owners.sql                                    52 lines
0005_properties.sql                                98 lines
0006_tenants.sql                                   62 lines
0007_leases.sql                                   126 lines
0008_rent.sql                                     146 lines
0009_payments.sql                                 141 lines
0010_cheques.sql                                  127 lines
0011_maintenance.sql                               76 lines
0012_vendors.sql                                   80 lines
0013_finance.sql                                  106 lines
0014_communication_documents_audit_system.sql     154 lines
0015_row_level_security.sql                       565 lines
0016_storage.sql                                   36 lines
0017_reference_data.sql                           129 lines
```

This is the part that matters most, and it is complete.

## Tests

Two files recovered. The handover claims 43 passing tests; these two contain
the assertions but I have not run them, so the count is unverified.

```
tests/allocation.test.ts                      133 lines
tests/business-rules.test.ts                  271 lines
```

## What is missing

Roughly 60 app files did not appear as a `create_file` call in either
transcript. Likely causes, in order of probability:

1. Written in a session whose transcript is not mounted here
2. Created by `bash` (`mkdir`, `cat >`, `npx create-next-app`) rather than `create_file`
3. Scaffolding never written by hand at all: `package.json`, `next.config.ts`,
   `tsconfig.json`, `.env.example`, `postcss.config`, lockfiles

Note that no `package.json` or `next.config.*` was recovered, which supports (3):
the project was almost certainly scaffolded by `create-next-app` and only the
hand-written files show up as `create_file`.

## Files recovered, in full

| Path | Lines |
| --- | --- |
| `app/(app)/leases/[id]/page.tsx` | 270 |
| `app/(app)/settings/page.tsx` | 297 |
| `app/(auth)/forgot-password/page.tsx` | 48 |
| `app/(auth)/invite/[token]/page.tsx` | 48 |
| `app/(auth)/layout.tsx` | 17 |
| `app/(auth)/reset-password/page.tsx` | 41 |
| `app/(auth)/sign-in/page.tsx` | 51 |
| `app/layout.tsx` | 23 |
| `app/setup/page.tsx` | 146 |
| `components/layout/mobile-nav.tsx` | 39 |
| `components/layout/sidebar.tsx` | 62 |
| `components/layout/topbar.tsx` | 38 |
| `components/shared/confirm-dialog.tsx` | 72 |
| `components/shared/empty-state.tsx` | 34 |
| `components/shared/field.tsx` | 58 |
| `components/shared/status-badge.tsx` | 62 |
| `components/ui/button.tsx` | 55 |
| `features/admin/actions.ts` | 167 |
| `features/admin/components/admin-controls.tsx` | 94 |
| `features/admin/queries.ts` | 261 |
| `features/auth/actions.ts` | 147 |
| `features/dashboard/components/charts.tsx` | 83 |
| `features/dashboard/queries.ts` | 169 |
| `features/finance/actions.ts` | 290 |
| `features/finance/components/finance-controls.tsx` | 229 |
| `features/finance/queries.ts` | 324 |
| `features/import/actions.ts` | 171 |
| `features/import/components/import-wizard.tsx` | 337 |
| `features/import/csv.ts` | 257 |
| `features/leases/actions.ts` | 435 |
| `features/leases/components/lease-actions.tsx` | 174 |
| `features/leases/components/lease-wizard.tsx` | 360 |
| `features/leases/queries.ts` | 303 |
| `features/maintenance/actions.ts` | 383 |
| `features/maintenance/components/maintenance-controls.tsx` | 200 |
| `features/maintenance/components/vendor-job-card.tsx` | 314 |
| `features/maintenance/queries.ts` | 317 |
| `features/notifications/components/notification-bell.tsx` | 134 |
| `features/notifications/service.ts` | 95 |
| `features/organisations/components/onboarding-flow.tsx` | 249 |
| `features/owners/actions.ts` | 189 |
| `features/owners/queries.ts` | 258 |
| `features/payments/actions-cheques.ts` | 217 |
| `features/payments/actions.ts` | 335 |
| `features/payments/allocation.ts` | 130 |
| `features/payments/components/cheque-status-actions.tsx` | 121 |
| `features/payments/components/payment-verification-actions.tsx` | 90 |
| `features/payments/components/record-payment-dialog.tsx` | 226 |
| `features/payments/queries.ts` | 316 |
| `features/portals/components/tenant-components.tsx` | 292 |
| `features/portals/owner-queries.ts` | 215 |
| `features/portals/tenant-queries.ts` | 338 |
| `features/properties/actions.ts` | 224 |
| `features/properties/components/property-form.tsx` | 145 |
| `features/properties/components/unit-form-dialog.tsx` | 133 |
| `features/properties/queries.ts` | 233 |
| `features/reports/queries.ts` | 258 |
| `features/search/actions.ts` | 181 |
| `features/search/components/command-menu.tsx` | 231 |
| `features/settings/actions.ts` | 194 |
| `features/settings/components/settings-forms.tsx` | 240 |
| `features/settings/queries.ts` | 110 |
| `lib/config/app.ts` | 30 |
| `lib/config/env.ts` | 66 |
| `lib/permissions/context.ts` | 116 |
| `lib/permissions/guards.ts` | 100 |
| `lib/supabase/client.ts` | 14 |
| `lib/supabase/middleware.ts` | 50 |
| `lib/supabase/server.ts` | 55 |
| `lib/utils/audit.ts` | 27 |
| `lib/utils/cn.ts` | 6 |
| `lib/utils/form-state.ts` | 71 |
| `lib/utils/format.ts` | 35 |
| `lib/validation/auth.ts` | 35 |
| `lib/validation/entities.ts` | 117 |
| `lib/validation/leases.ts` | 150 |
| `lib/validation/maintenance.ts` | 91 |
| `middleware.ts` | 12 |
| `supabase/migrations/0001_extensions_and_helpers.sql` | 85 |
| `supabase/migrations/0002_identity.sql` | 172 |
| `supabase/migrations/0003_subscriptions.sql` | 42 |
| `supabase/migrations/0004_owners.sql` | 52 |
| `supabase/migrations/0005_properties.sql` | 98 |
| `supabase/migrations/0006_tenants.sql` | 62 |
| `supabase/migrations/0007_leases.sql` | 126 |
| `supabase/migrations/0008_rent.sql` | 146 |
| `supabase/migrations/0009_payments.sql` | 141 |
| `supabase/migrations/0010_cheques.sql` | 127 |
| `supabase/migrations/0011_maintenance.sql` | 76 |
| `supabase/migrations/0012_vendors.sql` | 80 |
| `supabase/migrations/0013_finance.sql` | 106 |
| `supabase/migrations/0014_communication_documents_audit_system.sql` | 154 |
| `supabase/migrations/0015_row_level_security.sql` | 565 |
| `supabase/migrations/0016_storage.sql` | 36 |
| `supabase/migrations/0017_reference_data.sql` | 129 |
| `supabase/seed/demo_seed.sql` | 303 |
| `tests/allocation.test.ts` | 133 |
| `tests/business-rules.test.ts` | 271 |
| `types/database.ts` | 719 |