import { describe, expect, it } from "vitest";
import {
  planAllocation, validateManualAllocation, round2,
} from "@/features/payments/allocation";

/**
 * These cover the rent/payment rules the business depends on most:
 * partial payments must reduce a balance without settling an instalment,
 * and allocations must never exceed what's actually owed.
 */
describe("payment allocation", () => {
  const tenThousandInstalment = [{ id: "inst-1", outstanding_amount: 10_000 }];

  it("allocates a partial payment without settling the instalment", () => {
    const plan = planAllocation(6_000, tenThousandInstalment);

    expect(plan.allocations).toHaveLength(1);
    expect(plan.allocations[0]).toEqual({ instalmentId: "inst-1", amount: 6_000 });
    expect(plan.allocated).toBe(6_000);
    expect(plan.unallocated).toBe(0);
    // 4,000 remains outstanding on the instalment itself, which the DB trigger applies.
  });

  it("settles the remainder with a second payment", () => {
    // After the 6,000 payment above, the instalment owes 4,000.
    const plan = planAllocation(4_000, [{ id: "inst-1", outstanding_amount: 4_000 }]);

    expect(plan.allocated).toBe(4_000);
    expect(plan.unallocated).toBe(0);
    expect(plan.allocations[0].amount).toBe(4_000);
  });

  it("spreads a payment across multiple instalments oldest first", () => {
    const plan = planAllocation(15_000, [
      { id: "inst-1", outstanding_amount: 10_000 },
      { id: "inst-2", outstanding_amount: 10_000 },
    ]);

    expect(plan.allocations).toEqual([
      { instalmentId: "inst-1", amount: 10_000 },
      { instalmentId: "inst-2", amount: 5_000 },
    ]);
    expect(plan.allocated).toBe(15_000);
  });

  it("reports an overpayment as unallocated rather than over-allocating", () => {
    const plan = planAllocation(12_000, tenThousandInstalment);

    expect(plan.allocated).toBe(10_000);
    expect(plan.unallocated).toBe(2_000);
    expect(plan.allocations[0].amount).toBe(10_000);
  });

  it("skips instalments that are already settled", () => {
    const plan = planAllocation(5_000, [
      { id: "settled", outstanding_amount: 0 },
      { id: "open", outstanding_amount: 5_000 },
    ]);

    expect(plan.allocations).toHaveLength(1);
    expect(plan.allocations[0].instalmentId).toBe("open");
  });

  it("handles fractional amounts without floating point drift", () => {
    const plan = planAllocation(0.3, [
      { id: "a", outstanding_amount: 0.1 },
      { id: "b", outstanding_amount: 0.2 },
    ]);

    expect(plan.allocated).toBe(0.3);
    expect(plan.unallocated).toBe(0);
    expect(round2(plan.allocations.reduce((s, a) => s + a.amount, 0))).toBe(0.3);
  });

  it("allocates nothing when there is no outstanding rent", () => {
    const plan = planAllocation(5_000, []);

    expect(plan.allocations).toHaveLength(0);
    expect(plan.unallocated).toBe(5_000);
  });
});

describe("manual allocation validation", () => {
  const outstanding = [
    { id: "inst-1", outstanding_amount: 10_000 },
    { id: "inst-2", outstanding_amount: 5_000 },
  ];

  it("accepts a valid split", () => {
    const result = validateManualAllocation(
      12_000,
      [
        { instalmentId: "inst-1", amount: 8_000 },
        { instalmentId: "inst-2", amount: 4_000 },
      ],
      outstanding
    );
    expect(result.ok).toBe(true);
  });

  it("rejects allocating more than an instalment owes", () => {
    const result = validateManualAllocation(
      20_000,
      [{ instalmentId: "inst-2", amount: 9_000 }],
      outstanding
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("more than an instalment owes");
  });

  it("rejects allocations totalling more than the payment", () => {
    const result = validateManualAllocation(
      5_000,
      [
        { instalmentId: "inst-1", amount: 4_000 },
        { instalmentId: "inst-2", amount: 3_000 },
      ],
      outstanding
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("more than the payment amount");
  });

  it("rejects an instalment that is no longer outstanding", () => {
    const result = validateManualAllocation(1_000, [{ instalmentId: "ghost", amount: 500 }], outstanding);
    expect(result.ok).toBe(false);
  });

  it("rejects zero or negative amounts", () => {
    const result = validateManualAllocation(1_000, [{ instalmentId: "inst-1", amount: 0 }], outstanding);
    expect(result.ok).toBe(false);
  });
});
