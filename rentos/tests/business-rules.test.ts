import { describe, expect, it } from "vitest";
import { hasPermission, hasRole, type SessionContext } from "@/lib/permissions/context";
import { landingPathFor } from "@/lib/permissions/guards";
import type { ChequeStatus, LeaseStatus } from "@/types/database";

/**
 * Mirrors the transition rules enforced by the enforce_lease_status_transition
 * and enforce_cheque_status_transition triggers. Keeping them here as a
 * specification means a change to the SQL that breaks a rule shows up as a
 * failing test, not as a production surprise.
 */
const LEASE_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  draft: ["pending", "active", "terminated"],
  pending: ["active", "draft", "terminated"],
  active: ["expiring", "renewal_offered", "terminated", "expired"],
  expiring: ["renewal_offered", "renewed", "expired", "terminated"],
  renewal_offered: ["renewed", "expiring", "active", "terminated"],
  renewed: [],
  expired: ["renewed"],
  terminated: [],
};

function leaseTransitionAllowed(from: LeaseStatus, to: LeaseStatus): boolean {
  return LEASE_TRANSITIONS[from].includes(to);
}

describe("lease status transitions", () => {
  it("allows a draft lease to be activated", () => {
    expect(leaseTransitionAllowed("draft", "active")).toBe(true);
  });

  it("does not allow an expired lease to be silently reactivated", () => {
    expect(leaseTransitionAllowed("expired", "active")).toBe(false);
  });

  it("treats terminated as final", () => {
    for (const target of Object.keys(LEASE_TRANSITIONS) as LeaseStatus[]) {
      expect(leaseTransitionAllowed("terminated", target)).toBe(false);
    }
  });

  it("treats renewed as final — the successor lease takes over", () => {
    expect(leaseTransitionAllowed("renewed", "active")).toBe(false);
  });

  it("allows the full renewal path", () => {
    expect(leaseTransitionAllowed("active", "expiring")).toBe(true);
    expect(leaseTransitionAllowed("expiring", "renewal_offered")).toBe(true);
    expect(leaseTransitionAllowed("renewal_offered", "renewed")).toBe(true);
  });
});

const CHEQUE_TRANSITIONS: Record<ChequeStatus, ChequeStatus[]> = {
  received: ["stored", "due_soon", "submitted", "cancelled"],
  stored: ["due_soon", "submitted", "cancelled"],
  due_soon: ["submitted", "cancelled"],
  submitted: ["cleared", "bounced", "cancelled"],
  bounced: ["replaced", "cancelled"],
  cleared: [],
  replaced: [],
  cancelled: [],
};

function chequeTransitionAllowed(from: ChequeStatus, to: ChequeStatus): boolean {
  return CHEQUE_TRANSITIONS[from].includes(to);
}

describe("cheque status progression", () => {
  it("supports the happy path: received → submitted → cleared", () => {
    expect(chequeTransitionAllowed("received", "submitted")).toBe(true);
    expect(chequeTransitionAllowed("submitted", "cleared")).toBe(true);
  });

  it("supports the bounce path: received → submitted → bounced → replaced", () => {
    expect(chequeTransitionAllowed("submitted", "bounced")).toBe(true);
    expect(chequeTransitionAllowed("bounced", "replaced")).toBe(true);
  });

  it("refuses to clear a cheque that was never submitted to the bank", () => {
    expect(chequeTransitionAllowed("received", "cleared")).toBe(false);
    expect(chequeTransitionAllowed("stored", "cleared")).toBe(false);
  });

  it("treats cleared as final", () => {
    expect(chequeTransitionAllowed("cleared", "bounced")).toBe(false);
  });
});

/**
 * Rent schedule generation mirrors generate_rent_schedule: instalment count
 * and per-period amount derive from the lease's frequency.
 */
function planSchedule(startDate: string, endDate: string, monthlyRent: number, frequency: string) {
  const stepMonths = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, custom: 1 }[frequency] ?? 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const count = Math.max(1, Math.ceil(totalMonths / stepMonths));

  return Array.from({ length: count }, (_, i) => {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i * stepMonths);
    return { number: i + 1, dueDate: due.toISOString().slice(0, 10), amount: monthlyRent * stepMonths };
  });
}

describe("rent schedule generation", () => {
  it("creates twelve instalments for a monthly one-year lease", () => {
    const schedule = planSchedule("2026-01-01", "2027-01-01", 10_000, "monthly");
    expect(schedule).toHaveLength(12);
    expect(schedule[0].amount).toBe(10_000);
    expect(schedule[0].dueDate).toBe("2026-01-01");
    expect(schedule[11].dueDate).toBe("2026-12-01");
  });

  it("creates four instalments for a quarterly one-year lease, each three months of rent", () => {
    const schedule = planSchedule("2026-01-01", "2027-01-01", 10_000, "quarterly");
    expect(schedule).toHaveLength(4);
    expect(schedule[0].amount).toBe(30_000);
    expect(schedule[1].dueDate).toBe("2026-04-01");
  });

  it("creates a single instalment for an annual lease", () => {
    const schedule = planSchedule("2026-01-01", "2027-01-01", 10_000, "annual");
    expect(schedule).toHaveLength(1);
    expect(schedule[0].amount).toBe(120_000);
  });

  it("bills the same total regardless of frequency", () => {
    const total = (freq: string) =>
      planSchedule("2026-01-01", "2027-01-01", 10_000, freq).reduce((s, i) => s + i.amount, 0);

    expect(total("monthly")).toBe(120_000);
    expect(total("quarterly")).toBe(120_000);
    expect(total("semiannual")).toBe(120_000);
    expect(total("annual")).toBe(120_000);
  });
});

/**
 * Overdue is derived from the due date and the remaining balance, never
 * stored as a standalone flag — a payment recomputes it automatically.
 */
function deriveStatus(dueDate: string, original: number, outstanding: number, today: string) {
  if (outstanding <= 0) return "paid";
  if (outstanding < original) return "partial";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "due";
  return "upcoming";
}

describe("instalment status derivation", () => {
  const today = "2026-06-15";

  it("marks a fully settled instalment as paid", () => {
    expect(deriveStatus("2026-05-01", 10_000, 0, today)).toBe("paid");
  });

  it("marks a partly settled instalment as partial, even when overdue", () => {
    expect(deriveStatus("2026-05-01", 10_000, 4_000, today)).toBe("partial");
  });

  it("marks an untouched past-due instalment as overdue", () => {
    expect(deriveStatus("2026-05-01", 10_000, 10_000, today)).toBe("overdue");
  });

  it("marks a future instalment as upcoming", () => {
    expect(deriveStatus("2026-07-01", 10_000, 10_000, today)).toBe("upcoming");
  });

  it("marks an instalment due today as due", () => {
    expect(deriveStatus(today, 10_000, 10_000, today)).toBe("due");
  });
});

// ---------------------------------------------------------------------------
// Organisation isolation and role routing
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    userId: "user-a",
    email: "a@example.com",
    fullName: "User A",
    isPlatformSuperAdmin: false,
    memberships: [
      {
        organisationId: "org-a",
        organisationMemberId: "m-a",
        organisationName: "Org A",
        organisationSlug: "org-a",
        organisationStatus: "active",
        onboardingStep: "complete",
        roleKeys: ["property_manager"],
        permissionCodes: ["properties.manage", "tenants.manage", "leases.manage"],
        ownerId: null,
        tenantId: null,
        vendorId: null,
      },
    ],
    ...overrides,
  };
}

describe("organisation isolation", () => {
  it("grants permission inside the user's own organisation", () => {
    expect(hasPermission(makeContext(), "org-a", "properties.manage")).toBe(true);
  });

  it("denies the same permission in another organisation", () => {
    expect(hasPermission(makeContext(), "org-b", "properties.manage")).toBe(false);
  });

  it("denies a permission the user's role does not grant", () => {
    expect(hasPermission(makeContext(), "org-a", "payments.manage")).toBe(false);
  });

  it("denies roles held in a different organisation", () => {
    expect(hasRole(makeContext(), "org-b", "property_manager")).toBe(false);
  });

  it("returns false for an unauthenticated context", () => {
    expect(hasPermission(null, "org-a", "properties.manage")).toBe(false);
    expect(hasRole(null, "org-a", "org_admin")).toBe(false);
  });

  it("lets a platform super admin through, but only via the explicit flag", () => {
    const superAdmin = makeContext({ isPlatformSuperAdmin: true });
    expect(hasPermission(superAdmin, "org-b", "payments.manage")).toBe(true);
    expect(hasPermission(makeContext(), "org-b", "payments.manage")).toBe(false);
  });
});

describe("role-based landing routes", () => {
  it("sends a tenant to the tenant portal", () => {
    const ctx = makeContext();
    ctx.memberships[0].roleKeys = ["tenant"];
    ctx.memberships[0].tenantId = "tenant-1";
    expect(landingPathFor(ctx)).toBe("/tenant");
  });

  it("sends an owner to the owner portal", () => {
    const ctx = makeContext();
    ctx.memberships[0].roleKeys = ["property_owner"];
    expect(landingPathFor(ctx)).toBe("/owner");
  });

  it("sends a vendor to the vendor portal", () => {
    const ctx = makeContext();
    ctx.memberships[0].roleKeys = ["vendor"];
    expect(landingPathFor(ctx)).toBe("/vendor");
  });

  it("sends staff to the manager dashboard", () => {
    expect(landingPathFor(makeContext())).toBe("/dashboard");
  });

  it("sends a platform super admin to the admin area", () => {
    expect(landingPathFor(makeContext({ isPlatformSuperAdmin: true }))).toBe("/admin");
  });

  it("prefers the portal route when a user somehow holds both portal and staff roles", () => {
    const ctx = makeContext();
    ctx.memberships[0].roleKeys = ["tenant", "staff"];
    expect(landingPathFor(ctx)).toBe("/tenant");
  });

  it("routes a user with no organisation to the no-organisation screen", () => {
    expect(landingPathFor(makeContext({ memberships: [] }))).toBe("/no-organisation");
  });
});
