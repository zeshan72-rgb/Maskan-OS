import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface AllocationTarget {
  instalmentId: string;
  amount: number;
}

export interface AllocationPlan {
  allocations: AllocationTarget[];
  allocated: number;
  unallocated: number;
}

/**
 * Builds an allocation plan spreading a payment across outstanding
 * instalments, oldest due date first.
 *
 * This is the mechanism behind the partial-payment requirement: rent
 * obligations (rent_instalments) and money received (payments) are separate
 * records, joined by payment_allocations. A QAR 6,000 payment against a
 * QAR 10,000 instalment allocates 6,000 and leaves 4,000 outstanding — the
 * instalment's status becomes `partial`, not `paid`. A later 4,000 payment
 * allocates the remainder and flips it to `paid`.
 *
 * Any amount that exceeds the total outstanding is reported as `unallocated`
 * rather than silently over-allocating; the caller decides whether to hold it
 * as a credit or reject the entry.
 */
export function planAllocation(
  amount: number,
  outstandingInstalments: { id: string; outstanding_amount: number }[]
): AllocationPlan {
  let remaining = round2(amount);
  const allocations: AllocationTarget[] = [];

  for (const instalment of outstandingInstalments) {
    if (remaining <= 0) break;
    const outstanding = round2(Number(instalment.outstanding_amount));
    if (outstanding <= 0) continue;

    const applied = round2(Math.min(remaining, outstanding));
    allocations.push({ instalmentId: instalment.id, amount: applied });
    remaining = round2(remaining - applied);
  }

  return {
    allocations,
    allocated: round2(amount - remaining),
    unallocated: remaining,
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Validates a manual allocation against the instalments' real outstanding
 * balances, so a user can't allocate more to an instalment than it owes or
 * more in total than the payment is worth.
 */
export function validateManualAllocation(
  paymentAmount: number,
  entries: AllocationTarget[],
  outstandingInstalments: { id: string; outstanding_amount: number }[]
): { ok: true } | { ok: false; message: string } {
  const outstandingById = new Map(
    outstandingInstalments.map((i) => [i.id, round2(Number(i.outstanding_amount))])
  );

  let total = 0;
  for (const entry of entries) {
    if (entry.amount <= 0) return { ok: false, message: "Allocation amounts must be greater than zero." };

    const outstanding = outstandingById.get(entry.instalmentId);
    if (outstanding === undefined) {
      return { ok: false, message: "One of the selected instalments is no longer outstanding." };
    }
    if (round2(entry.amount) > outstanding) {
      return {
        ok: false,
        message: `You can't allocate more than an instalment owes (max ${outstanding.toFixed(2)}).`,
      };
    }
    total = round2(total + entry.amount);
  }

  if (total > round2(paymentAmount)) {
    return { ok: false, message: "Allocations add up to more than the payment amount." };
  }

  return { ok: true };
}

/**
 * Writes allocation rows. The database triggers on payment_allocations then
 * decrement each instalment's outstanding_amount and recompute its status,
 * which keeps the ledger consistent no matter which code path created the
 * allocation (manual entry, cheque clearing, or provider webhook).
 */
export async function writeAllocations(
  supabase: Client,
  paymentId: string,
  allocations: AllocationTarget[]
): Promise<void> {
  if (allocations.length === 0) return;

  const { error } = await supabase.from("payment_allocations").insert(
    allocations.map((a) => ({
      payment_id: paymentId,
      rent_instalment_id: a.instalmentId,
      amount: a.amount,
    }))
  );
  if (error) throw error;
}

/** Sequential receipt number, unique per organisation. */
export async function nextReceiptNumber(supabase: Client, organisationId: string): Promise<string> {
  const { count } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  const year = new Date().getFullYear();
  return `RCP-${year}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}
