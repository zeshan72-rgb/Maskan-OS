import { createClient } from "@/lib/supabase/server";
import type { InstalmentStatus, LeaseStatus, PaymentFrequency, PaymentMethodType } from "@/types/database";

export const PAGE_SIZE = 20;

export interface LeaseListRow {
  id: string;
  lease_code: string;
  status: LeaseStatus;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  payment_frequency: PaymentFrequency;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  outstanding: number;
}

export async function listLeases(params: {
  organisationId: string;
  q?: string;
  status?: string;
  expiring?: string;
  page?: number;
}): Promise<{ rows: LeaseListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("leases")
    .select(
      "id, lease_code, status, start_date, end_date, monthly_rent, payment_frequency, tenants ( name ), properties ( name ), units ( unit_number )",
      { count: "exact" }
    )
    .eq("organisation_id", params.organisationId);

  if (params.status) query = query.eq("status", params.status as LeaseStatus);
  if (params.q) query = query.ilike("lease_code", `%${params.q}%`);

  // "Expiring within N days" — the renewal pipeline view.
  if (params.expiring) {
    const days = Number(params.expiring);
    if (Number.isFinite(days)) {
      const limit = new Date();
      limit.setDate(limit.getDate() + days);
      query = query
        .gte("end_date", new Date().toISOString().slice(0, 10))
        .lte("end_date", limit.toISOString().slice(0, 10))
        .in("status", ["active", "expiring", "renewal_offered"]);
    }
  }

  const { data, count, error } = await query
    .order("end_date", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const leases = data ?? [];
  const ids = leases.map((l) => l.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  // Batched outstanding balance per lease.
  const { data: instalments } = await supabase
    .from("rent_instalments")
    .select("lease_id, outstanding_amount")
    .in("lease_id", ids);

  const outstandingByLease = new Map<string, number>();
  for (const inst of instalments ?? []) {
    outstandingByLease.set(
      inst.lease_id,
      (outstandingByLease.get(inst.lease_id) ?? 0) + Number(inst.outstanding_amount)
    );
  }

  return {
    rows: leases.map((l) => {
      const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
      const property = Array.isArray(l.properties) ? l.properties[0] : l.properties;
      const unit = Array.isArray(l.units) ? l.units[0] : l.units;
      return {
        id: l.id,
        lease_code: l.lease_code,
        status: l.status,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: Number(l.monthly_rent),
        payment_frequency: l.payment_frequency,
        tenant_name: tenant?.name ?? "—",
        property_name: property?.name ?? "—",
        unit_number: unit?.unit_number ?? "—",
        outstanding: outstandingByLease.get(l.id) ?? 0,
      };
    }),
    total: count ?? 0,
    page,
  };
}

export interface LeaseInstalment {
  id: string;
  instalment_number: number;
  due_date: string;
  original_amount: number;
  outstanding_amount: number;
  status: InstalmentStatus;
  allocations: { payment_id: string; amount: number; reference: string | null; paid_at: string }[];
}

export interface LeaseDetail {
  id: string;
  organisation_id: string;
  lease_code: string;
  status: LeaseStatus;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  total_contract_rent: number;
  security_deposit: number;
  payment_frequency: PaymentFrequency;
  payment_method: PaymentMethodType;
  grace_period_days: number;
  notes: string | null;
  property: { id: string; name: string } | null;
  unit: { id: string; unit_number: string } | null;
  tenant: { id: string; name: string; email: string | null; phone: string | null } | null;
  owner: { id: string; name: string } | null;
  instalments: LeaseInstalment[];
  totals: { billed: number; collected: number; outstanding: number; overdue: number };
  events: { id: string; event_type: string; notes: string | null; created_at: string }[];
  renewalOffers: {
    id: string;
    new_start_date: string;
    new_end_date: string;
    new_monthly_rent: number;
    status: string;
    created_at: string;
  }[];
  hasSchedule: boolean;
}

export async function getLease(organisationId: string, leaseId: string): Promise<LeaseDetail | null> {
  const supabase = await createClient();

  const { data: lease } = await supabase
    .from("leases")
    .select(
      `id, organisation_id, lease_code, status, start_date, end_date, monthly_rent, total_contract_rent,
       security_deposit, payment_frequency, payment_method, grace_period_days, notes,
       properties ( id, name ), units ( id, unit_number ),
       tenants ( id, name, email, phone ), owners ( id, name )`
    )
    .eq("id", leaseId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!lease) return null;

  const [{ data: instalments }, { data: events }, { data: offers }] = await Promise.all([
    supabase
      .from("rent_instalments")
      .select("id, instalment_number, due_date, original_amount, outstanding_amount, status")
      .eq("lease_id", leaseId)
      .order("instalment_number"),
    supabase
      .from("lease_events")
      .select("id, event_type, notes, created_at")
      .eq("lease_id", leaseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_renewal_offers")
      .select("id, new_start_date, new_end_date, new_monthly_rent, status, created_at")
      .eq("lease_id", leaseId)
      .order("created_at", { ascending: false }),
  ]);

  const instalmentRows = instalments ?? [];
  const instalmentIds = instalmentRows.map((i) => i.id);

  // Batched allocations + their parent payments, so the schedule can show
  // exactly which payments settled each instalment.
  const allocationsByInstalment = new Map<string, LeaseInstalment["allocations"]>();
  if (instalmentIds.length > 0) {
    const { data: allocations } = await supabase
      .from("payment_allocations")
      .select("rent_instalment_id, amount, payment_id")
      .in("rent_instalment_id", instalmentIds);

    const paymentIds = Array.from(new Set((allocations ?? []).map((a) => a.payment_id)));
    const paymentMeta = new Map<string, { reference: string | null; paid_at: string }>();
    if (paymentIds.length > 0) {
      const { data: payments } = await supabase
        .from("payments")
        .select("id, reference, paid_at")
        .in("id", paymentIds);
      for (const p of payments ?? []) paymentMeta.set(p.id, { reference: p.reference, paid_at: p.paid_at });
    }

    for (const allocation of allocations ?? []) {
      if (!allocation.rent_instalment_id) continue;
      const meta = paymentMeta.get(allocation.payment_id);
      const list = allocationsByInstalment.get(allocation.rent_instalment_id) ?? [];
      list.push({
        payment_id: allocation.payment_id,
        amount: Number(allocation.amount),
        reference: meta?.reference ?? null,
        paid_at: meta?.paid_at ?? "",
      });
      allocationsByInstalment.set(allocation.rent_instalment_id, list);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const billed = instalmentRows.reduce((s, i) => s + Number(i.original_amount), 0);
  const outstanding = instalmentRows.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const overdue = instalmentRows
    .filter((i) => i.due_date < today && Number(i.outstanding_amount) > 0)
    .reduce((s, i) => s + Number(i.outstanding_amount), 0);

  const property = Array.isArray(lease.properties) ? lease.properties[0] : lease.properties;
  const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units;
  const tenant = Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants;
  const owner = Array.isArray(lease.owners) ? lease.owners[0] : lease.owners;

  return {
    id: lease.id,
    organisation_id: lease.organisation_id,
    lease_code: lease.lease_code,
    status: lease.status,
    start_date: lease.start_date,
    end_date: lease.end_date,
    monthly_rent: Number(lease.monthly_rent),
    total_contract_rent: Number(lease.total_contract_rent),
    security_deposit: Number(lease.security_deposit),
    payment_frequency: lease.payment_frequency,
    payment_method: lease.payment_method,
    grace_period_days: lease.grace_period_days,
    notes: lease.notes,
    property: property ?? null,
    unit: unit ?? null,
    tenant: tenant ?? null,
    owner: owner ?? null,
    instalments: instalmentRows.map((i) => ({
      id: i.id,
      instalment_number: i.instalment_number,
      due_date: i.due_date,
      original_amount: Number(i.original_amount),
      outstanding_amount: Number(i.outstanding_amount),
      status: i.status,
      allocations: allocationsByInstalment.get(i.id) ?? [],
    })),
    totals: { billed, collected: billed - outstanding, outstanding, overdue },
    events: events ?? [],
    renewalOffers: (offers ?? []).map((o) => ({ ...o, new_monthly_rent: Number(o.new_monthly_rent) })),
    hasSchedule: instalmentRows.length > 0,
  };
}

/** Units available to lease (vacant or reserved) plus the unit already on a lease being edited. */
export async function getLeasableUnits(organisationId: string, propertyId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("units")
    .select("id, unit_number, property_id, current_rent, market_rent, status, bedrooms")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .in("status", ["vacant", "reserved"]);

  if (propertyId) query = query.eq("property_id", propertyId);

  const { data } = await query.order("unit_number");
  return data ?? [];
}

export async function getTenantOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, name, phone")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

/** Outstanding instalments for a lease, oldest first — used by payment allocation UI. */
export async function getOutstandingInstalments(organisationId: string, leaseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rent_instalments")
    .select("id, instalment_number, due_date, original_amount, outstanding_amount, status")
    .eq("organisation_id", organisationId)
    .eq("lease_id", leaseId)
    .gt("outstanding_amount", 0)
    .order("due_date");
  return (data ?? []).map((i) => ({
    ...i,
    original_amount: Number(i.original_amount),
    outstanding_amount: Number(i.outstanding_amount),
  }));
}
