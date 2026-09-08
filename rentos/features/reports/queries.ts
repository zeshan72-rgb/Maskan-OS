import { createClient } from "@/lib/supabase/server";

export interface PortfolioReport {
  properties: { name: string; type: string; units: number; occupied: number; vacant: number; monthlyRent: number }[];
  totals: { properties: number; units: number; occupied: number; vacant: number; monthlyRent: number };
}

export async function getPortfolioReport(organisationId: string): Promise<PortfolioReport> {
  const supabase = await createClient();

  const [{ data: properties }, { data: units }, { data: leases }] = await Promise.all([
    supabase.from("properties").select("id, name, type").eq("organisation_id", organisationId).is("archived_at", null),
    supabase.from("units").select("property_id, status").eq("organisation_id", organisationId).is("archived_at", null),
    supabase.from("leases").select("property_id, monthly_rent").eq("organisation_id", organisationId).eq("status", "active"),
  ]);

  const unitsByProperty = new Map<string, { units: number; occupied: number; vacant: number }>();
  for (const unit of units ?? []) {
    const entry = unitsByProperty.get(unit.property_id) ?? { units: 0, occupied: 0, vacant: 0 };
    entry.units += 1;
    if (unit.status === "occupied") entry.occupied += 1;
    if (unit.status === "vacant") entry.vacant += 1;
    unitsByProperty.set(unit.property_id, entry);
  }

  const rentByProperty = new Map<string, number>();
  for (const lease of leases ?? []) {
    rentByProperty.set(lease.property_id, (rentByProperty.get(lease.property_id) ?? 0) + Number(lease.monthly_rent));
  }

  const rows = (properties ?? []).map((p) => {
    const stats = unitsByProperty.get(p.id) ?? { units: 0, occupied: 0, vacant: 0 };
    return {
      name: p.name,
      type: p.type,
      units: stats.units,
      occupied: stats.occupied,
      vacant: stats.vacant,
      monthlyRent: rentByProperty.get(p.id) ?? 0,
    };
  });

  return {
    properties: rows,
    totals: {
      properties: rows.length,
      units: rows.reduce((s, r) => s + r.units, 0),
      occupied: rows.reduce((s, r) => s + r.occupied, 0),
      vacant: rows.reduce((s, r) => s + r.vacant, 0),
      monthlyRent: rows.reduce((s, r) => s + r.monthlyRent, 0),
    },
  };
}

export interface CollectionReportRow {
  month: string;
  expected: number;
  collected: number;
  outstanding: number;
  rate: number;
}

export async function getCollectionReport(organisationId: string, months = 12): Promise<CollectionReportRow[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { data } = await supabase
    .from("rent_instalments")
    .select("due_date, original_amount, outstanding_amount")
    .eq("organisation_id", organisationId)
    .gte("due_date", start.toISOString().slice(0, 10));

  const buckets = new Map<string, { expected: number; collected: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(d.toISOString().slice(0, 7), { expected: 0, collected: 0 });
  }

  for (const inst of data ?? []) {
    const key = inst.due_date.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.expected += Number(inst.original_amount);
    bucket.collected += Number(inst.original_amount) - Number(inst.outstanding_amount);
  }

  return Array.from(buckets.entries()).map(([month, values]) => ({
    month,
    expected: values.expected,
    collected: values.collected,
    outstanding: values.expected - values.collected,
    rate: values.expected > 0 ? Math.round((values.collected / values.expected) * 100) : 0,
  }));
}

export interface LeaseExpiryRow {
  lease_code: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  end_date: string;
  daysRemaining: number;
  monthly_rent: number;
  status: string;
}

export async function getLeaseExpiryReport(organisationId: string, withinDays = 120): Promise<LeaseExpiryRow[]> {
  const supabase = await createClient();
  const limit = new Date();
  limit.setDate(limit.getDate() + withinDays);

  const { data } = await supabase
    .from("leases")
    .select("lease_code, end_date, monthly_rent, status, tenants ( name ), properties ( name ), units ( unit_number )")
    .eq("organisation_id", organisationId)
    .in("status", ["active", "expiring", "renewal_offered"])
    .lte("end_date", limit.toISOString().slice(0, 10))
    .order("end_date");

  const today = Date.now();

  return (data ?? []).map((l) => {
    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
    const property = Array.isArray(l.properties) ? l.properties[0] : l.properties;
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;
    return {
      lease_code: l.lease_code,
      tenant_name: tenant?.name ?? "—",
      property_name: property?.name ?? "—",
      unit_number: unit?.unit_number ?? "—",
      end_date: l.end_date,
      daysRemaining: Math.ceil((new Date(l.end_date).getTime() - today) / 86_400_000),
      monthly_rent: Number(l.monthly_rent),
      status: l.status,
    };
  });
}

export interface ChequeReportRow {
  status: string;
  count: number;
  amount: number;
}

export async function getChequeReport(organisationId: string): Promise<ChequeReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cheques")
    .select("status, amount")
    .eq("organisation_id", organisationId);

  const buckets = new Map<string, { count: number; amount: number }>();
  for (const cheque of data ?? []) {
    const entry = buckets.get(cheque.status) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += Number(cheque.amount);
    buckets.set(cheque.status, entry);
  }

  return Array.from(buckets.entries())
    .map(([status, values]) => ({ status, ...values }))
    .sort((a, b) => b.amount - a.amount);
}

export interface VendorPerformanceRow {
  vendor_name: string;
  assigned: number;
  completed: number;
  totalCost: number;
  avgCost: number;
  completionRate: number;
}

export async function getVendorPerformanceReport(organisationId: string): Promise<VendorPerformanceRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_orders")
    .select("vendor_id, status, actual_amount, vendors ( name )")
    .eq("organisation_id", organisationId)
    .not("vendor_id", "is", null);

  const buckets = new Map<string, { name: string; assigned: number; completed: number; totalCost: number }>();

  for (const wo of data ?? []) {
    if (!wo.vendor_id) continue;
    const vendor = Array.isArray(wo.vendors) ? wo.vendors[0] : wo.vendors;
    const entry = buckets.get(wo.vendor_id) ?? {
      name: vendor?.name ?? "Unknown vendor", assigned: 0, completed: 0, totalCost: 0,
    };
    entry.assigned += 1;
    if (["completed", "closed"].includes(wo.status)) {
      entry.completed += 1;
      entry.totalCost += Number(wo.actual_amount ?? 0);
    }
    buckets.set(wo.vendor_id, entry);
  }

  return Array.from(buckets.values())
    .map((v) => ({
      vendor_name: v.name,
      assigned: v.assigned,
      completed: v.completed,
      totalCost: v.totalCost,
      avgCost: v.completed > 0 ? v.totalCost / v.completed : 0,
      completionRate: v.assigned > 0 ? Math.round((v.completed / v.assigned) * 100) : 0,
    }))
    .sort((a, b) => b.assigned - a.assigned);
}

export interface MaintenanceReportRow {
  category: string;
  total: number;
  open: number;
  completed: number;
  avgAgeDays: number;
}

export async function getMaintenanceReport(organisationId: string): Promise<MaintenanceReportRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("maintenance_requests")
    .select("status, created_at, updated_at, maintenance_categories ( name )")
    .eq("organisation_id", organisationId);

  const buckets = new Map<string, { total: number; open: number; completed: number; ageSum: number }>();
  const now = Date.now();

  for (const request of data ?? []) {
    const category = Array.isArray(request.maintenance_categories)
      ? request.maintenance_categories[0]
      : request.maintenance_categories;
    const name = category?.name ?? "Uncategorised";
    const entry = buckets.get(name) ?? { total: 0, open: 0, completed: 0, ageSum: 0 };

    entry.total += 1;
    const isDone = ["completed", "closed", "cancelled"].includes(request.status);
    if (isDone) entry.completed += 1;
    else entry.open += 1;

    const endTime = isDone ? new Date(request.updated_at).getTime() : now;
    entry.ageSum += (endTime - new Date(request.created_at).getTime()) / 86_400_000;

    buckets.set(name, entry);
  }

  return Array.from(buckets.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      open: v.open,
      completed: v.completed,
      avgAgeDays: v.total > 0 ? Math.round((v.ageSum / v.total) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
