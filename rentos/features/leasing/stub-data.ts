/**
 * STUB DATA, NOT WIRED TO THE DATABASE.
 *
 * The prototype's letting pipeline (leads, viewings, registered broker
 * introductions, offers) has no schema in this project. The 17 recovered
 * migrations create no `leads`, `offers`, `viewings`, `brokers` or
 * `parties` table, so there is nothing to query.
 *
 * These fixtures let the screens be built, reviewed and demoed now. They
 * mirror the prototype's own sample data so the layouts are exercised
 * realistically.
 *
 * TODO: add the migration, then replace each read here with a real query.
 * The tables needed, from the prototype's model:
 *
 *   leads      unit_id, client_name, contact, source, stage, budget,
 *              target_move_in, party_id (the agent or agency working it),
 *              registered_at, claim_expires
 *   viewings   lead_id, scheduled_at, agent, outcome
 *   offers     unit_id, lead_id, term_months, monthly_rent, free_months,
 *              free_at, bills_included, bills_cap, cheque_count, status,
 *              and the assumptions the owner was shown so the figure stays
 *              reproducible
 *   parties    internal and external agents, shared with maintenance
 *
 * One rule worth carrying over: a registered introduction claims the
 * client, not the property. Two agencies may work the same unit with
 * different clients and both claims stand.
 */

export type LeadStage = "enquiry" | "viewing_booked" | "viewed" | "offer_made" | "reserved" | "lost";

export interface StubLead {
  id: string;
  code: string;
  unit: string;
  property: string;
  clientName: string;
  clientPhone: string;
  source: string;
  stage: LeadStage;
  budget: number;
  agent: string;
  agentKind: "internal" | "external";
  registeredAt: string;
  claimExpires: string;
  offered: number | null;
  note: string;
}

export const STUB_LEADS: StubLead[] = [
  {
    id: "lead-118", code: "ENQ-118", unit: "Tower A / 1204", property: "The Pearl Residences",
    clientName: "Ahmed Nasser", clientPhone: "+974 5577 3311", source: "Property Finder",
    stage: "viewing_booked", budget: 9500, agent: "Layla Hassan", agentKind: "internal",
    registeredAt: "2026-08-20", claimExpires: "2026-09-19", offered: null,
    note: "Family of four relocating from Dubai. Second viewing booked.",
  },
  {
    id: "lead-121", code: "ENQ-121", unit: "Tower A / 1204", property: "The Pearl Residences",
    clientName: "Marie Dubois", clientPhone: "+974 3344 8822", source: "Direct enquiry",
    stage: "enquiry", budget: 9000, agent: "Doha Property Partners", agentKind: "external",
    registeredAt: "2026-08-23", claimExpires: "2026-09-22", offered: null,
    note: "Second agency on the same unit. Different client, so both claims stand.",
  },
  {
    id: "lead-109", code: "ENQ-109", unit: "Tower B / 204", property: "The Pearl Residences",
    clientName: "Rajesh Pillai", clientPhone: "+974 5588 1122", source: "Walk in",
    stage: "offer_made", budget: 8000, agent: "Omar Farouk", agentKind: "internal",
    registeredAt: "2026-08-12", claimExpires: "2026-09-11", offered: 7900,
    note: "Offered QAR 7,900 against an asking of 8,200. With the owner.",
  },
  {
    id: "lead-114", code: "ENQ-114", unit: "Marina / 503", property: "Lusail Marina View",
    clientName: "Sarah Whitfield", clientPhone: "+44 7700 445566", source: "Gulf Realty",
    stage: "reserved", budget: 11000, agent: "Gulf Realty Qatar", agentKind: "external",
    registeredAt: "2026-08-16", claimExpires: "2026-09-15", offered: 11000,
    note: "Deposit taken. Move-in wizard started.",
  },
  {
    id: "lead-102", code: "ENQ-102", unit: "Villa 4", property: "Al Waab Villa Compound",
    clientName: "Yusuf Karim", clientPhone: "+974 6611 3344", source: "Property Finder",
    stage: "viewed", budget: 15000, agent: "Layla Hassan", agentKind: "internal",
    registeredAt: "2026-08-08", claimExpires: "2026-09-07", offered: null,
    note: "Viewed twice. Negotiating on rent.",
  },
  {
    id: "lead-097", code: "ENQ-097", unit: "Retail Podium / R2", property: "Al Sadd Business Center",
    clientName: "Qatar Coffee Roasters", clientPhone: "+974 4400 9911", source: "Cold call",
    stage: "lost", budget: 20000, agent: "Omar Farouk", agentKind: "internal",
    registeredAt: "2026-07-02", claimExpires: "2026-08-01", offered: 19000,
    note: "Took a smaller unit elsewhere. Asking rent may be too high.",
  },
];

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: "enquiry", label: "Enquiry" },
  { value: "viewing_booked", label: "Viewing booked" },
  { value: "viewed", label: "Viewed" },
  { value: "offer_made", label: "Offer made" },
  { value: "reserved", label: "Reserved" },
  { value: "lost", label: "Lost" },
];

export interface StubOfferScenario {
  id: number;
  name: string;
  termMonths: number;
  monthlyRent: number;
  freeMonths: number;
  freeAt: "start" | "end";
  billsIncluded: boolean;
  billsCap: number;
  chequeCount: number;
}

export const STUB_OFFER = {
  unit: "Tower A / 1204",
  property: "The Pearl Residences",
  asking: 9500,
  client: "Ahmed Nasser",
  /** Assumptions the owner is shown. Changing these changes every figure. */
  assume: { voidMonths: 1, reletCost: 9500, feePct: 15 },
  scenarios: [
    { id: 1, name: "Standard", termMonths: 12, monthlyRent: 9500, freeMonths: 0, freeAt: "end", billsIncluded: false, billsCap: 0, chequeCount: 12 },
    { id: 2, name: "Longer term", termMonths: 24, monthlyRent: 9200, freeMonths: 0, freeAt: "end", billsIncluded: false, billsCap: 0, chequeCount: 24 },
    { id: 3, name: "Two months free", termMonths: 14, monthlyRent: 9500, freeMonths: 2, freeAt: "end", billsIncluded: false, billsCap: 0, chequeCount: 12 },
    { id: 4, name: "Bills included", termMonths: 12, monthlyRent: 10600, freeMonths: 0, freeAt: "end", billsIncluded: true, billsCap: 800, chequeCount: 12 },
  ] as StubOfferScenario[],
};

/**
 * What a scenario actually earns.
 *
 * The figure that matters is annualised including the void, not the total.
 * A longer term always shows a bigger total and frequently earns less per
 * year, because a short term is never really short: the unit sits empty
 * while it is re-let. This is the calculation the prototype's offer builder
 * exists to make visible.
 */
export function offerMaths(s: StubOfferScenario, assume = STUB_OFFER.assume) {
  const chargedMonths = s.termMonths - s.freeMonths;
  const gross = chargedMonths * s.monthlyRent;
  const bills = s.billsIncluded ? s.billsCap * s.termMonths : 0;
  const fee = Math.round((gross * assume.feePct) / 100);
  const net = gross - bills - fee;
  const cycleMonths = s.termMonths + assume.voidMonths;
  const withVoid = Math.round(((net - assume.reletCost) / cycleMonths) * 12);
  return { chargedMonths, gross, bills, fee, net, annualised: Math.round((net / s.termMonths) * 12), withVoid };
}

export const STUB_OFFERS_LIST = [
  { id: "of-0042", code: "OF-0042", unit: "Tower A / 1204", property: "The Pearl Residences", client: "Ahmed Nasser", asking: 9500, offered: 9500, status: "with_owner", madeOn: "2026-08-24", expiresOn: "2026-08-31", agent: "Layla Hassan" },
  { id: "of-0039", code: "OF-0039", unit: "Tower B / 204", property: "The Pearl Residences", client: "Rajesh Pillai", asking: 8200, offered: 7900, status: "countered", madeOn: "2026-08-19", expiresOn: "2026-08-26", agent: "Omar Farouk" },
  { id: "of-0035", code: "OF-0035", unit: "Marina / 503", property: "Lusail Marina View", client: "Sarah Whitfield", asking: 11000, offered: 11000, status: "accepted", madeOn: "2026-08-16", expiresOn: "2026-08-23", agent: "Gulf Realty Qatar" },
  { id: "of-0031", code: "OF-0031", unit: "Retail Podium / R2", property: "Al Sadd Business Center", client: "Qatar Coffee Roasters", asking: 22000, offered: 19000, status: "declined", madeOn: "2026-07-20", expiresOn: "2026-07-27", agent: "Omar Farouk" },
];
