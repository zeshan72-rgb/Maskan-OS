import { createClient } from "@/lib/supabase/server";

export interface OwnerPortalSummary {
  ownerName: string;
  properties: { id: string; name: string; address: string | null; units: number; occupied: number }[];
  totals: {
    properties: number;
    units: number;
    occupied: number;
    vacant: number;
    rentReceived: number;
    outstanding: number;
    expenses: number;
    managementFees: number;
    netToOwner: number;
  };
  openMaintenance: number;
}

/**
 * Resolves the owner's whole portfolio in a handful of batched queries.
 * Every table involved is also RLS-scoped to properties this owner is linked
 * to, so a compromised owner_id in the session still couldn't widen the view.
 */
export async function getOwnerPortalSummary(
  organisationId: string,
  ownerId: string,
  period?: { start: string; end: string }
): Promise<OwnerPortalSummary> {
  const supabase = await createClient();

  const now = new Date();
  const periodStart = period?.start ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = period?.end ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [{ data: owner }, { data: links }] = await Promise.all([
    supabase.from("owners").select("name").eq("id", ownerId).maybeSingle(),
    supabase.from("property_owners").select("property_id, properties ( id, name, address )").eq("owner_id", ownerId),
  ]);

  const properties = (links ?? [])
    .map((l) => {
      const p = Array.isArray(l.properties) ? l.properties[0] : l.properties;
      return p ? { id: p.id, name: p.name, address: p.address } : null;
    })
    .filter((p): p is { id: string; name: string; address: string | null } => p !== null);

  const propertyIds = properties.map((p) => p.id);

  if (propertyIds.length === 0) {
    return {
      ownerName: owner?.name ?? "",
      properties: [],
      totals: {
        properties: 0, units: 0, occupied: 0, vacant: 0,
        rentReceived: 0, outstanding: 0, expenses: 0, managementFees: 0, netToOwner: 0,
      },
      openMaintenance: 0,
    };
  }

  const [{ data: units }, { data: leases }, { data: expenses }, { data: maintenance }] = await Promise.all([
    supabase.from("units").select("id, property_id, status").in("property_id", propertyIds).is("archived_at", null),
    supabase.from("leases").select("id, property_id, monthly_rent, status").in("property_id", propertyIds),
    supabase
      .from("property_expenses")
      .select("amount, property_id, category_id, expense_categories ( name )")
      .in("property_id", propertyIds)
      .gte("expense_date", periodStart)
      .lte("expense_date", periodEnd)
      .eq("approval_status", "approved"),
    supabase
      .from("maintenance_requests")
      .select("id")
      .in("property_id", propertyIds)
      .not("status", "in", "(closed,cancelled)"),
  ]);

  const unitRows = units ?? [];
  const leaseIds = (leases ?? []).map((l) => l.id);

  // Rent received in the period = the portion of each instalment that has been settled.
  let rentReceived = 0;
  let outstanding = 0;
  if (leaseIds.length > 0) {
    const { data: instalments } = await supabase
      .from("rent_instalments")
      .select("original_amount, outstanding_amount, due_date")
      .in("lease_id", leaseIds)
      .gte("due_date", periodStart)
      .lte("due_date", periodEnd);

    for (const inst of instalments ?? []) {
      rentReceived += Number(inst.original_amount) - Number(inst.outstanding_amount);
      outstanding += Number(inst.outstanding_amount);
    }
  }

  const expenseRows = expenses ?? [];
  const managementFees = expenseRows
    .filter((e) => {
      const category = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories;
      return category?.name === "Management Fee";
    })
    .reduce((s, e) => s + Number(e.amount), 0);
  const otherExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0) - managementFees;

  const unitsByProperty = new Map<string, { units: number; occupied: number }>();
  for (const unit of unitRows) {
    const entry = unitsByProperty.get(unit.property_id) ?? { units: 0, occupied: 0 };
    entry.units += 1;
    if (unit.status === "occupied") entry.occupied += 1;
    unitsByProperty.set(unit.property_id, entry);
  }

  return {
    ownerName: owner?.name ?? "",
    properties: properties.map((p) => ({
      ...p,
      units: unitsByProperty.get(p.id)?.units ?? 0,
      occupied: unitsByProperty.get(p.id)?.occupied ?? 0,
    })),
    totals: {
      properties: properties.length,
      units: unitRows.length,
      occupied: unitRows.filter((u) => u.status === "occupied").length,
      vacant: unitRows.filter((u) => u.status === "vacant").length,
      rentReceived,
      outstanding,
      expenses: otherExpenses,
      managementFees,
      netToOwner: rentReceived - otherExpenses - managementFees,
    },
    openMaintenance: (maintenance ?? []).length,
  };
}

export async function getOwnerStatements(organisationId: string, ownerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owner_statements")
    .select(
      `id, period_start, period_end, opening_balance, rent_received, other_income, expenses,
       maintenance_costs, management_fees, adjustments, owner_payout, closing_balance, status, version, created_at`
    )
    .eq("organisation_id", organisationId)
    .eq("owner_id", ownerId)
    .order("period_start", { ascending: false });

  return (data ?? []).map((s) => ({
    ...s,
    opening_balance: Number(s.opening_balance),
    rent_received: Number(s.rent_received),
    other_income: Number(s.other_income),
    expenses: Number(s.expenses),
    maintenance_costs: Number(s.maintenance_costs),
    management_fees: Number(s.management_fees),
    adjustments: Number(s.adjustments),
    owner_payout: Number(s.owner_payout),
    closing_balance: Number(s.closing_balance),
  }));
}

export async function getOwnerMaintenance(ownerId: string) {
  const supabase = await createClient();

  const { data: links } = await supabase.from("property_owners").select("property_id").eq("owner_id", ownerId);
  const propertyIds = (links ?? []).map((l) => l.property_id);
  if (propertyIds.length === 0) return [];

  const { data } = await supabase
    .from("maintenance_requests")
    .select("id, request_code, description, priority, status, created_at, properties ( name ), units ( unit_number )")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => {
    const property = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const unit = Array.isArray(r.units) ? r.units[0] : r.units;
    return {
      id: r.id,
      request_code: r.request_code,
      description: r.description,
      priority: r.priority,
      status: r.status,
      created_at: r.created_at,
      property_name: property?.name ?? "—",
      unit_number: unit?.unit_number ?? "—",
    };
  });
}

export async function getOwnerFinancials(ownerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("owner_transactions")
    .select("id, transaction_type, amount, transaction_date, notes, properties ( name )")
    .eq("owner_id", ownerId)
    .order("transaction_date", { ascending: false })
    .limit(100);

  return (data ?? []).map((t) => {
    const property = Array.isArray(t.properties) ? t.properties[0] : t.properties;
    return {
      id: t.id,
      transaction_type: t.transaction_type,
      amount: Number(t.amount),
      transaction_date: t.transaction_date,
      notes: t.notes,
      property_name: property?.name ?? null,
    };
  });
}
