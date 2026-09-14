/**
 * STUB DATA, NOT WIRED TO THE DATABASE.
 *
 * The management mandate has no schema in this project. The 17 recovered
 * migrations create no `mandates` or `mandate_properties` table, so there is
 * nothing to query. Offers are equally absent; the owner-facing offer screen
 * reads the fixtures in features/leasing/stub-data.ts instead.
 *
 * TODO: add the migration, then replace each read with a real query.
 *
 *   mandates            owner_id, mandate_code, type, is_exclusive,
 *                       starts_on, ends_on, notice_days, status,
 *                       may_sign_lease, may_accept_offers, may_hold_deposit,
 *                       may_register_lease, maintenance_spend_cap,
 *                       contract_document_id
 *   mandate_properties  mandate_id, property_id
 *
 * Why this matters beyond a screen: the mandate is the answer to "why are
 * you allowed to do that". Every lease signed, deposit held and repair
 * approved traces back to one. Its authority limits should gate workflow,
 * not merely be displayed — a quote above the spend cap ought to pause for
 * the owner rather than being assigned. Property the firm owns outright has
 * no mandate at all, which is the distinction that keeps owned and managed
 * books apart.
 */

export interface StubAuthority {
  key: string;
  label: string;
  granted: boolean;
  detail: string;
}

export const STUB_MANDATE = {
  code: "MD-014",
  type: "Letting and management",
  isExclusive: true,
  startsOn: "2026-01-01",
  endsOn: "2026-12-31",
  noticeDays: 60,
  status: "active" as "active" | "expiring" | "terminated",
  managementFeePct: 8,
  lettingFeeMonths: 1,
  renewalFeeMonths: 0.5,
  properties: ["The Pearl Residences"],
  authorities: [
    { key: "sign_lease", label: "Sign a tenancy on your behalf", granted: true,
      detail: "Up to the asking rent. Anything below it comes back to you." },
    { key: "accept_offers", label: "Accept an offer without asking", granted: false,
      detail: "Every offer is put to you, whatever the amount." },
    { key: "hold_deposit", label: "Hold the security deposit", granted: true,
      detail: "Held in the client account, returned at the end of the tenancy." },
    { key: "register_lease", label: "Register the lease with the municipality", granted: true,
      detail: "Done within the statutory window after signing." },
    { key: "spend_cap", label: "Approve repairs up to QAR 2,500", granted: true,
      detail: "Anything above that waits for you, however urgent." },
  ] as StubAuthority[],
};

export function mandateDaysRemaining(endsOn = STUB_MANDATE.endsOn) {
  return Math.ceil((new Date(endsOn).getTime() - Date.now()) / 86_400_000);
}
