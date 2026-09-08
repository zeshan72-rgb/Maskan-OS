import { createClient } from "@/lib/supabase/server";

export interface FinanceOverview {
  expectedThisMonth: number;
  receivedThisMonth: number;
  outstandingThisMonth: number;
  totalArrears: number;
  expensesThisMonth: number;
  managementFeesThisMonth: number;
  ownerPayable: number;
  pendingVerification: number;
  chequesDueSoon: number;
}

export async function getFinanceOverview(organisationId: string): Promise<FinanceOverview> {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);

  const [monthInstalments, allOutstanding, expenses, pending, cheques] = await Promise.all([
    supabase
      .from("rent_instalments")
      .select("original_amount, outstanding_amount")
      .eq("organisation_id", organisationId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
    supabase
      .from("rent_instalments")
      .select("outstanding_amount")
      .eq("organisation_id", organisationId)
      .gt("outstanding_amount", 0)
      .lt("due_date", today),
    supabase
      .from("property_expenses")
      .select("amount, expense_categories ( name )")
      .eq("organisation_id", organisationId)
      .eq("approval_status", "approved")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
    supabase
      .from("payments")
      .select("amount")
      .eq("organisation_id", organisationId)
      .eq("status", "pending_verification"),
    supabase
      .from("cheques")
      .select("amount")
      .eq("organisation_id", organisationId)
      .in("status", ["received", "stored", "due_soon"])
      .lte("cheque_date", in30.toISOString().slice(0, 10)),
  ]);

  const expected = (monthInstalments.data ?? []).reduce((s, i) => s + Number(i.original_amount), 0);
  const outstandingThisMonth = (monthInstalments.data ?? []).reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const received = expected - outstandingThisMonth;

  const expenseRows = expenses.data ?? [];
  const managementFees = expenseRows
    .filter((e) => {
      const category = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories;
      return category?.name === "Management Fee";
    })
    .reduce((s, e) => s + Number(e.amount), 0);
  const otherExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0) - managementFees;

  return {
    expectedThisMonth: expected,
    receivedThisMonth: received,
    outstandingThisMonth,
    totalArrears: (allOutstanding.data ?? []).reduce((s, i) => s + Number(i.outstanding_amount), 0),
    expensesThisMonth: otherExpenses,
    managementFeesThisMonth: managementFees,
    ownerPayable: received - otherExpenses - managementFees,
    pendingVerification: (pending.data ?? []).length,
    chequesDueSoon: (cheques.data ?? []).length,
  };
}

export interface ExpenseRow {
  id: string;
  description: string | null;
  amount: number;
  expense_date: string;
  approval_status: string;
  property_name: string;
  owner_name: string | null;
  vendor_name: string | null;
  category_name: string | null;
}

export async function listExpenses(params: {
  organisationId: string;
  q?: string;
  status?: string;
  page?: number;
}): Promise<{ rows: ExpenseRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("property_expenses")
    .select(
      `id, description, amount, expense_date, approval_status,
       properties ( name ), owners ( name ), vendors ( name ), expense_categories ( name )`,
      { count: "exact" }
    )
    .eq("organisation_id", params.organisationId);

  if (params.status) query = query.eq("approval_status", params.status);
  if (params.q) query = query.ilike("description", `%${params.q}%`);

  const { data, count, error } = await query
    .order("expense_date", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    rows: (data ?? []).map((e) => {
      const property = Array.isArray(e.properties) ? e.properties[0] : e.properties;
      const owner = Array.isArray(e.owners) ? e.owners[0] : e.owners;
      const vendor = Array.isArray(e.vendors) ? e.vendors[0] : e.vendors;
      const category = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories;

      return {
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        expense_date: e.expense_date,
        approval_status: e.approval_status,
        property_name: property?.name ?? "—",
        owner_name: owner?.name ?? null,
        vendor_name: vendor?.name ?? null,
        category_name: category?.name ?? null,
      };
    }),
    total: count ?? 0,
    page,
  };
}

export interface OwnerStatementPreview {
  ownerId: string;
  ownerName: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  rentReceived: number;
  otherIncome: number;
  expenses: number;
  maintenanceCosts: number;
  managementFees: number;
  adjustments: number;
  ownerPayout: number;
  closingBalance: number;
  lineItems: { description: string; amount: number }[];
}

/**
 * Computes an owner statement for a period from the underlying records.
 *
 * The arithmetic is deliberately explicit and derived from real rows rather
 * than stored aggregates:
 *
 *   payout = rent received + other income
 *          − expenses − maintenance − management fees + adjustments
 *   closing = opening + payout
 *
 * Opening balance is the running total of every owner_transaction before the
 * period, so consecutive statements chain correctly.
 */
export async function buildOwnerStatement(
  organisationId: string,
  ownerId: string,
  periodStart: string,
  periodEnd: string
): Promise<OwnerStatementPreview | null> {
  const supabase = await createClient();

  const { data: owner } = await supabase
    .from("owners")
    .select("id, name")
    .eq("id", ownerId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (!owner) return null;

  const { data: links } = await supabase
    .from("property_owners")
    .select("property_id, properties ( name )")
    .eq("owner_id", ownerId);
  const propertyIds = (links ?? []).map((l) => l.property_id);

  const lineItems: { description: string; amount: number }[] = [];

  // Opening balance: everything recorded before this period.
  const { data: priorTransactions } = await supabase
    .from("owner_transactions")
    .select("amount")
    .eq("owner_id", ownerId)
    .lt("transaction_date", periodStart);
  const openingBalance = (priorTransactions ?? []).reduce((s, t) => s + Number(t.amount), 0);

  let rentReceived = 0;
  let maintenanceCosts = 0;
  let expenses = 0;
  let managementFees = 0;

  if (propertyIds.length > 0) {
    const { data: leases } = await supabase
      .from("leases")
      .select("id, property_id")
      .in("property_id", propertyIds);
    const leaseIds = (leases ?? []).map((l) => l.id);

    if (leaseIds.length > 0) {
      // Rent "received" = the settled portion of instalments due in the period.
      const { data: instalments } = await supabase
        .from("rent_instalments")
        .select("original_amount, outstanding_amount, due_date, lease_id")
        .in("lease_id", leaseIds)
        .gte("due_date", periodStart)
        .lte("due_date", periodEnd);

      for (const inst of instalments ?? []) {
        const settled = Number(inst.original_amount) - Number(inst.outstanding_amount);
        if (settled > 0) rentReceived += settled;
      }
      if (rentReceived > 0) lineItems.push({ description: "Rent collected", amount: rentReceived });
    }

    const { data: expenseRows } = await supabase
      .from("property_expenses")
      .select("amount, description, maintenance_request_id, expense_categories ( name ), properties ( name )")
      .in("property_id", propertyIds)
      .eq("approval_status", "approved")
      .gte("expense_date", periodStart)
      .lte("expense_date", periodEnd);

    for (const expense of expenseRows ?? []) {
      const category = Array.isArray(expense.expense_categories)
        ? expense.expense_categories[0]
        : expense.expense_categories;
      const property = Array.isArray(expense.properties) ? expense.properties[0] : expense.properties;
      const amount = Number(expense.amount);
      const label = [expense.description, property?.name].filter(Boolean).join(" — ") || "Expense";

      if (category?.name === "Management Fee") {
        managementFees += amount;
        lineItems.push({ description: `Management fee — ${property?.name ?? ""}`.trim(), amount: -amount });
      } else if (expense.maintenance_request_id) {
        maintenanceCosts += amount;
        lineItems.push({ description: `Maintenance — ${label}`, amount: -amount });
      } else {
        expenses += amount;
        lineItems.push({ description: label, amount: -amount });
      }
    }
  }

  // Manual adjustments recorded directly against the owner in this period.
  const { data: adjustmentRows } = await supabase
    .from("owner_transactions")
    .select("amount, notes")
    .eq("owner_id", ownerId)
    .eq("transaction_type", "adjustment")
    .gte("transaction_date", periodStart)
    .lte("transaction_date", periodEnd);

  const adjustments = (adjustmentRows ?? []).reduce((s, t) => s + Number(t.amount), 0);
  for (const adjustment of adjustmentRows ?? []) {
    lineItems.push({ description: adjustment.notes ?? "Adjustment", amount: Number(adjustment.amount) });
  }

  const otherIncome = 0;
  const ownerPayout = rentReceived + otherIncome - expenses - maintenanceCosts - managementFees + adjustments;

  return {
    ownerId,
    ownerName: owner.name,
    periodStart,
    periodEnd,
    openingBalance,
    rentReceived,
    otherIncome,
    expenses,
    maintenanceCosts,
    managementFees,
    adjustments,
    ownerPayout,
    closingBalance: openingBalance + ownerPayout,
    lineItems,
  };
}

export async function listOwnerStatements(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owner_statements")
    .select("id, owner_id, period_start, period_end, owner_payout, closing_balance, status, version, owners ( name )")
    .eq("organisation_id", organisationId)
    .order("period_start", { ascending: false })
    .limit(100);

  return (data ?? []).map((s) => {
    const owner = Array.isArray(s.owners) ? s.owners[0] : s.owners;
    return {
      id: s.id,
      owner_id: s.owner_id,
      owner_name: owner?.name ?? "—",
      period_start: s.period_start,
      period_end: s.period_end,
      owner_payout: Number(s.owner_payout),
      closing_balance: Number(s.closing_balance),
      status: s.status,
      version: s.version,
    };
  });
}
