import { createClient } from "@/lib/supabase/server";
import type { ChequeStatus, PaymentMethodType, PaymentStatus } from "@/types/database";

export const PAGE_SIZE = 20;

export interface PaymentListRow {
  id: string;
  amount: number;
  method: PaymentMethodType;
  status: PaymentStatus;
  reference: string | null;
  payer_name: string | null;
  paid_at: string;
  tenant_name: string;
  lease_code: string;
  lease_id: string;
  allocated: number;
  receipt_number: string | null;
}

export async function listPayments(params: {
  organisationId: string;
  q?: string;
  status?: string;
  method?: string;
  page?: number;
}): Promise<{ rows: PaymentListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("payments")
    .select(
      "id, amount, method, status, reference, payer_name, paid_at, lease_id, tenants ( name ), leases ( lease_code )",
      { count: "exact" }
    )
    .eq("organisation_id", params.organisationId);

  if (params.status) query = query.eq("status", params.status as PaymentStatus);
  if (params.method) query = query.eq("method", params.method as PaymentMethodType);
  if (params.q) query = query.ilike("reference", `%${params.q}%`);

  const { data, count, error } = await query
    .order("paid_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const payments = data ?? [];
  const ids = payments.map((p) => p.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  const [{ data: allocations }, { data: receipts }] = await Promise.all([
    supabase.from("payment_allocations").select("payment_id, amount").in("payment_id", ids),
    supabase.from("receipts").select("payment_id, receipt_number").in("payment_id", ids),
  ]);

  const allocatedByPayment = new Map<string, number>();
  for (const a of allocations ?? []) {
    allocatedByPayment.set(a.payment_id, (allocatedByPayment.get(a.payment_id) ?? 0) + Number(a.amount));
  }
  const receiptByPayment = new Map((receipts ?? []).map((r) => [r.payment_id, r.receipt_number]));

  return {
    rows: payments.map((p) => {
      const tenant = Array.isArray(p.tenants) ? p.tenants[0] : p.tenants;
      const lease = Array.isArray(p.leases) ? p.leases[0] : p.leases;
      return {
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        reference: p.reference,
        payer_name: p.payer_name,
        paid_at: p.paid_at,
        lease_id: p.lease_id,
        tenant_name: tenant?.name ?? "—",
        lease_code: lease?.lease_code ?? "—",
        allocated: allocatedByPayment.get(p.id) ?? 0,
        receipt_number: receiptByPayment.get(p.id) ?? null,
      };
    }),
    total: count ?? 0,
    page,
  };
}

export interface ChequeListRow {
  id: string;
  cheque_number: string;
  bank_name: string;
  payer_name: string;
  amount: number;
  cheque_date: string;
  received_date: string;
  status: ChequeStatus;
  lease_code: string;
  lease_id: string;
  tenant_name: string;
  /** true when the cheque date is within the next 30 days and it hasn't been banked yet */
  dueSoon: boolean;
}

export async function listCheques(params: {
  organisationId: string;
  q?: string;
  status?: string;
  page?: number;
}): Promise<{ rows: ChequeListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("cheques")
    .select(
      "id, cheque_number, bank_name, payer_name, amount, cheque_date, received_date, status, lease_id, leases ( lease_code, tenants ( name ) )",
      { count: "exact" }
    )
    .eq("organisation_id", params.organisationId);

  if (params.status) query = query.eq("status", params.status as ChequeStatus);
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`cheque_number.ilike.${term},bank_name.ilike.${term},payer_name.ilike.${term}`);
  }

  const { data, count, error } = await query
    .order("cheque_date", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);
  const horizonIso = horizon.toISOString().slice(0, 10);

  return {
    rows: (data ?? []).map((c) => {
      const lease = Array.isArray(c.leases) ? c.leases[0] : c.leases;
      const tenant = lease && "tenants" in lease
        ? (Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants)
        : null;
      return {
        id: c.id,
        cheque_number: c.cheque_number,
        bank_name: c.bank_name,
        payer_name: c.payer_name,
        amount: Number(c.amount),
        cheque_date: c.cheque_date,
        received_date: c.received_date,
        status: c.status,
        lease_id: c.lease_id,
        lease_code: lease?.lease_code ?? "—",
        tenant_name: tenant?.name ?? "—",
        dueSoon: ["received", "stored", "due_soon"].includes(c.status) && c.cheque_date <= horizonIso,
      };
    }),
    total: count ?? 0,
    page,
  };
}

export interface ChequeDetail {
  id: string;
  organisation_id: string;
  cheque_number: string;
  bank_name: string;
  payer_name: string;
  amount: number;
  cheque_date: string;
  received_date: string;
  status: ChequeStatus;
  internal_notes: string | null;
  lease_id: string;
  lease_code: string;
  tenant_name: string;
  instalment: { id: string; instalment_number: number; due_date: string; outstanding_amount: number } | null;
  payment_id: string | null;
  timeline: { id: string; from_status: ChequeStatus | null; to_status: ChequeStatus; notes: string | null; created_at: string }[];
}

export async function getCheque(organisationId: string, chequeId: string): Promise<ChequeDetail | null> {
  const supabase = await createClient();

  const { data: cheque } = await supabase
    .from("cheques")
    .select(
      `id, organisation_id, cheque_number, bank_name, payer_name, amount, cheque_date, received_date,
       status, internal_notes, lease_id, rent_instalment_id, payment_id,
       leases ( lease_code, tenants ( name ) )`
    )
    .eq("id", chequeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!cheque) return null;

  const [{ data: events }, instalmentResult] = await Promise.all([
    supabase
      .from("cheque_events")
      .select("id, from_status, to_status, notes, created_at")
      .eq("cheque_id", chequeId)
      .order("created_at"),
    cheque.rent_instalment_id
      ? supabase
          .from("rent_instalments")
          .select("id, instalment_number, due_date, outstanding_amount")
          .eq("id", cheque.rent_instalment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lease = Array.isArray(cheque.leases) ? cheque.leases[0] : cheque.leases;
  const tenant = lease && "tenants" in lease
    ? (Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants)
    : null;
  const instalment = instalmentResult.data;

  return {
    id: cheque.id,
    organisation_id: cheque.organisation_id,
    cheque_number: cheque.cheque_number,
    bank_name: cheque.bank_name,
    payer_name: cheque.payer_name,
    amount: Number(cheque.amount),
    cheque_date: cheque.cheque_date,
    received_date: cheque.received_date,
    status: cheque.status,
    internal_notes: cheque.internal_notes,
    lease_id: cheque.lease_id,
    lease_code: lease?.lease_code ?? "—",
    tenant_name: tenant?.name ?? "—",
    payment_id: cheque.payment_id,
    instalment: instalment
      ? {
          id: instalment.id,
          instalment_number: instalment.instalment_number,
          due_date: instalment.due_date,
          outstanding_amount: Number(instalment.outstanding_amount),
        }
      : null,
    timeline: events ?? [],
  };
}

export interface ArrearsRow {
  tenant_name: string;
  property_name: string;
  unit_number: string;
  lease_id: string;
  amount: number;
  oldestDueDate: string;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
}

/**
 * Arrears ageing: groups every outstanding instalment by how long it's been
 * overdue, so collections can be prioritised by age rather than size.
 */
export async function getArrearsAgeing(organisationId: string): Promise<{
  rows: ArrearsRow[];
  buckets: Record<ArrearsRow["bucket"], number>;
}> {
  const supabase = await createClient();

  const { data: instalments } = await supabase
    .from("rent_instalments")
    .select("lease_id, due_date, outstanding_amount, leases ( tenants ( name ), properties ( name ), units ( unit_number ) )")
    .eq("organisation_id", organisationId)
    .gt("outstanding_amount", 0)
    .order("due_date");

  const today = new Date();
  const byLease = new Map<string, ArrearsRow>();
  const buckets: Record<ArrearsRow["bucket"], number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

  for (const inst of instalments ?? []) {
    const amount = Number(inst.outstanding_amount);
    const ageDays = Math.floor((today.getTime() - new Date(inst.due_date).getTime()) / 86_400_000);

    const bucket: ArrearsRow["bucket"] =
      ageDays <= 0 ? "current" : ageDays <= 30 ? "1-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+";
    buckets[bucket] += amount;

    const lease = Array.isArray(inst.leases) ? inst.leases[0] : inst.leases;
    const tenant = lease && "tenants" in lease ? (Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants) : null;
    const property = lease && "properties" in lease ? (Array.isArray(lease.properties) ? lease.properties[0] : lease.properties) : null;
    const unit = lease && "units" in lease ? (Array.isArray(lease.units) ? lease.units[0] : lease.units) : null;

    const existing = byLease.get(inst.lease_id);
    if (existing) {
      existing.amount += amount;
      // Instalments arrive ordered by due date, so the first one seen is oldest.
      if (bucketRank(bucket) > bucketRank(existing.bucket)) existing.bucket = bucket;
    } else {
      byLease.set(inst.lease_id, {
        lease_id: inst.lease_id,
        tenant_name: tenant?.name ?? "—",
        property_name: property?.name ?? "—",
        unit_number: unit?.unit_number ?? "—",
        amount,
        oldestDueDate: inst.due_date,
        bucket,
      });
    }
  }

  return {
    rows: Array.from(byLease.values()).sort((a, b) => b.amount - a.amount),
    buckets,
  };
}

function bucketRank(bucket: ArrearsRow["bucket"]): number {
  return { current: 0, "1-30": 1, "31-60": 2, "61-90": 3, "90+": 4 }[bucket];
}
