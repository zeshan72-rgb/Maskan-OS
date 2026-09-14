/**
 * STUB DATA, NOT WIRED TO THE DATABASE.
 *
 * Bank reconciliation and opening balances have no schema in this project.
 * The 17 recovered migrations create `bank_accounts` but nothing to hold an
 * imported statement, a matched line, or a balance carried in from whatever
 * the firm used before.
 *
 * These fixtures let both screens be built and reviewed now.
 *
 * TODO: add the migration, then replace each read with a real query.
 *
 *   bank_transactions       bank_account_id, value_date, description,
 *                           reference, amount, direction, import_batch_id,
 *                           matched_payment_id, matched_at, matched_by
 *   reconciliation_sessions bank_account_id, period_start, period_end,
 *                           opening_statement_balance, closing_statement_balance,
 *                           status, reconciled_by, reconciled_at
 *   opening_balances        lease_id or owner_id, as_at, amount, direction,
 *                           source, note, locked
 *
 * Two rules worth carrying over from the prototype.
 *
 * Reconciliation refuses to close on a variance. If the statement says one
 * thing and the ledger another, the session stays open and names the gap.
 * Closing anyway is how a discrepancy becomes permanent.
 *
 * An opening balance is locked once accepted. It is the line between "what
 * we were told" and "what we have recorded ourselves", and editing it later
 * silently rewrites history that predates the system.
 */

export type MatchState = "matched" | "unmatched" | "suggested" | "ignored";

export interface StubBankLine {
  id: string;
  valueDate: string;
  description: string;
  reference: string | null;
  amount: number;
  direction: "in" | "out";
  state: MatchState;
  matchedTo: string | null;
  suggestion: string | null;
}

export const STUB_BANK_LINES: StubBankLine[] = [
  { id: "bt-1", valueDate: "2026-08-02", description: "TRANSFER FROM A NASSER", reference: "TRF-88213", amount: 9500, direction: "in", state: "matched", matchedTo: "PAY-0031 · LEASE-0012", suggestion: null },
  { id: "bt-2", valueDate: "2026-08-03", description: "TRANSFER FROM F NOOR", reference: "TRF-88214", amount: 5700, direction: "in", state: "matched", matchedTo: "PAY-0032 · LEASE-0005", suggestion: null },
  { id: "bt-3", valueDate: "2026-08-05", description: "CHQ DEPOSIT 448120", reference: "CHQ448120", amount: 12500, direction: "in", state: "matched", matchedTo: "PAY-0033 · LEASE-0003", suggestion: null },
  { id: "bt-4", valueDate: "2026-08-08", description: "TRANSFER FROM QATAR ENERGY SVC", reference: null, amount: 1200, direction: "in", state: "suggested", matchedTo: null, suggestion: "Employer contribution, LEASE-0001. Reference missing." },
  { id: "bt-5", valueDate: "2026-08-11", description: "INWARD TRANSFER", reference: "TRF-90021", amount: 8200, direction: "in", state: "unmatched", matchedTo: null, suggestion: null },
  { id: "bt-6", valueDate: "2026-08-14", description: "RETURNED CHEQUE 773455", reference: "CHQ773455", amount: 54000, direction: "out", state: "matched", matchedTo: "Reversal of PAY-0028", suggestion: null },
  { id: "bt-7", valueDate: "2026-08-18", description: "BANK CHARGES", reference: null, amount: 75, direction: "out", state: "ignored", matchedTo: null, suggestion: "Bank charge, not a tenancy movement." },
  { id: "bt-8", valueDate: "2026-08-22", description: "TRANSFER FROM E PETROVA", reference: "TRF-90118", amount: 11000, direction: "in", state: "unmatched", matchedTo: null, suggestion: null },
];

export const STUB_RECONCILIATION = {
  bankAccount: "Qatar National Bank · ···· 6789 · operating",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  openingStatementBalance: 412_300,
  closingStatementBalance: 404_925,
  /** What the ledger says arrived and left over the same period. */
  ledgerIn: 39_900,
  ledgerOut: 54_075,
  status: "open" as "open" | "closed",
};

export function reconciliationTotals(lines = STUB_BANK_LINES, r = STUB_RECONCILIATION) {
  const statementIn = lines.filter((l) => l.direction === "in").reduce((s, l) => s + l.amount, 0);
  const statementOut = lines.filter((l) => l.direction === "out").reduce((s, l) => s + l.amount, 0);
  const matched = lines.filter((l) => l.state === "matched").length;
  const unmatched = lines.filter((l) => l.state === "unmatched").length;
  const suggested = lines.filter((l) => l.state === "suggested").length;
  // The variance is what stops the session closing. Statement movement
  // against ledger movement; anything other than zero needs explaining.
  const variance = statementIn - statementOut - (r.ledgerIn - r.ledgerOut);
  return { statementIn, statementOut, matched, unmatched, suggested, variance, canClose: variance === 0 && unmatched === 0 };
}

export interface StubOpeningBalance {
  id: string;
  subject: string;
  kind: "tenant" | "owner";
  reference: string;
  asAt: string;
  amount: number;
  direction: "owed_to_us" | "owed_by_us";
  source: string;
  locked: boolean;
  note: string;
}

export const STUB_OPENING_BALANCES: StubOpeningBalance[] = [
  { id: "ob-1", subject: "Ahmed Hassan", kind: "tenant", reference: "LEASE-0003", asAt: "2026-01-01", amount: 8200, direction: "owed_to_us", source: "Previous system export", locked: true, note: "One month's rent outstanding at migration." },
  { id: "ob-2", subject: "Elena Petrova", kind: "tenant", reference: "LEASE-0007", asAt: "2026-01-01", amount: 0, direction: "owed_to_us", source: "Previous system export", locked: true, note: "Up to date at migration." },
  { id: "ob-3", subject: "Jassim Al-Thani", kind: "owner", reference: "OWN-001", asAt: "2026-01-01", amount: 23_400, direction: "owed_by_us", source: "Spreadsheet, signed off by owner", locked: true, note: "Rent collected in December, not yet paid out." },
  { id: "ob-4", subject: "Lusail Capital Real Estate", kind: "owner", reference: "OWN-005", asAt: "2026-01-01", amount: 61_800, direction: "owed_by_us", source: "Spreadsheet, signed off by owner", locked: true, note: "Two months of collections carried over." },
  { id: "ob-5", subject: "Karim Bousaid", kind: "tenant", reference: "LEASE-0009", asAt: "2026-01-01", amount: 3_500, direction: "owed_to_us", source: "Manual entry, disputed", locked: false, note: "Tenant disputes the figure. Not locked until agreed." },
];
