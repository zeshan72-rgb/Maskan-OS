import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  portfolio: { properties: number; units: number; occupied: number; vacant: number; occupancyPct: number };
  rent: { expected: number; collected: number; outstanding: number; overdue: number; collectionPct: number };
  leases: { active: number; expiring30: number; expiring60: number; expiring90: number };
  maintenance: { newCount: number; inProgress: number; urgent: number; overdue: number };
  alerts: { label: string; count: number; href: string; tone: "danger" | "warning" | "info" }[];
  collectionTrend: { month: string; expected: number; collected: number }[];
  maintenanceByCategory: { category: string; count: number }[];
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-GB", { month: "short" });
}

/**
 * Loads every dashboard KPI from the database in a small number of batched
 * queries. Nothing here is hardcoded — the figures move as records change.
 */
export async function getDashboardData(organisationId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const trendStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60);
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90);

  const [
    propertiesRes,
    unitsRes,
    leasesRes,
    instalmentsRes,
    maintenanceRes,
    chequesRes,
  ] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId).is("archived_at", null),
    supabase.from("units").select("status")
      .eq("organisation_id", organisationId).is("archived_at", null),
    supabase.from("leases").select("id, status, end_date")
      .eq("organisation_id", organisationId).in("status", ["active", "expiring", "renewal_offered"]),
    supabase.from("rent_instalments").select("due_date, original_amount, outstanding_amount, status")
      .eq("organisation_id", organisationId)
      .gte("due_date", trendStart.toISOString().slice(0, 10))
      .lte("due_date", monthEnd.toISOString().slice(0, 10)),
    supabase.from("maintenance_requests")
      .select("id, status, priority, created_at, maintenance_categories ( name )")
      .eq("organisation_id", organisationId)
      .not("status", "in", "(closed,cancelled)"),
    supabase.from("cheques").select("id, status, cheque_date")
      .eq("organisation_id", organisationId).in("status", ["received", "stored", "due_soon", "submitted", "bounced"]),
  ]);

  const units = unitsRes.data ?? [];
  const occupied = units.filter((u) => u.status === "occupied").length;
  const vacant = units.filter((u) => u.status === "vacant").length;

  const leases = leasesRes.data ?? [];
  const expiringWithin = (limit: Date) =>
    leases.filter((l) => l.end_date >= todayIso && new Date(l.end_date) <= limit).length;

  const instalments = instalmentsRes.data ?? [];

  // This month's collection figures
  const thisMonth = instalments.filter(
    (i) => i.due_date >= monthStart.toISOString().slice(0, 10) && i.due_date <= monthEnd.toISOString().slice(0, 10)
  );
  const expected = thisMonth.reduce((s, i) => s + Number(i.original_amount), 0);
  const outstandingThisMonth = thisMonth.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const collected = expected - outstandingThisMonth;

  // Total arrears across the whole loaded window (anything past due and unpaid)
  const overdue = instalments
    .filter((i) => i.due_date < todayIso && Number(i.outstanding_amount) > 0)
    .reduce((s, i) => s + Number(i.outstanding_amount), 0);

  // 6-month collection trend
  const trendBuckets = new Map<string, { month: string; expected: number; collected: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    trendBuckets.set(monthKey(d), { month: monthLabel(d), expected: 0, collected: 0 });
  }
  for (const inst of instalments) {
    const key = inst.due_date.slice(0, 7);
    const bucket = trendBuckets.get(key);
    if (!bucket) continue;
    bucket.expected += Number(inst.original_amount);
    bucket.collected += Number(inst.original_amount) - Number(inst.outstanding_amount);
  }

  const maintenance = maintenanceRes.data ?? [];
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const categoryCounts = new Map<string, number>();
  for (const request of maintenance) {
    const category = Array.isArray(request.maintenance_categories)
      ? request.maintenance_categories[0]
      : request.maintenance_categories;
    const name = category?.name ?? "Uncategorised";
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }

  const cheques = chequesRes.data ?? [];
  const bouncedCheques = cheques.filter((c) => c.status === "bounced").length;
  const chequesDueSoon = cheques.filter(
    (c) => ["received", "stored", "due_soon"].includes(c.status) && c.cheque_date <= in30.toISOString().slice(0, 10)
  ).length;

  const overdueInstalmentCount = instalments.filter(
    (i) => i.due_date < todayIso && Number(i.outstanding_amount) > 0
  ).length;

  const urgentMaintenance = maintenance.filter((m) => m.priority === "emergency").length;

  const alerts = [
    { label: "Overdue rent instalments", count: overdueInstalmentCount, href: "/finance/outstanding", tone: "danger" as const },
    { label: "Bounced cheques", count: bouncedCheques, href: "/payments/cheques?status=bounced", tone: "danger" as const },
    { label: "Cheques due in 30 days", count: chequesDueSoon, href: "/payments/cheques", tone: "warning" as const },
    { label: "Leases expiring in 60 days", count: expiringWithin(in60), href: "/leases?expiring=60", tone: "warning" as const },
    { label: "Urgent maintenance", count: urgentMaintenance, href: "/maintenance?priority=emergency", tone: "danger" as const },
  ].filter((a) => a.count > 0);

  return {
    portfolio: {
      properties: propertiesRes.count ?? 0,
      units: units.length,
      occupied,
      vacant,
      occupancyPct: units.length ? Math.round((occupied / units.length) * 100) : 0,
    },
    rent: {
      expected,
      collected,
      outstanding: outstandingThisMonth,
      overdue,
      collectionPct: expected > 0 ? Math.round((collected / expected) * 100) : 0,
    },
    leases: {
      active: leases.length,
      expiring30: expiringWithin(in30),
      expiring60: expiringWithin(in60),
      expiring90: expiringWithin(in90),
    },
    maintenance: {
      newCount: maintenance.filter((m) => m.status === "submitted").length,
      inProgress: maintenance.filter((m) => ["assigned", "scheduled", "in_progress"].includes(m.status)).length,
      urgent: urgentMaintenance,
      overdue: maintenance.filter(
        (m) => new Date(m.created_at) < sevenDaysAgo && !["completed", "closed"].includes(m.status)
      ).length,
    },
    alerts,
    collectionTrend: Array.from(trendBuckets.values()),
    maintenanceByCategory: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
