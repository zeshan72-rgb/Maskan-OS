import { createClient } from "@/lib/supabase/server";
import type { InstalmentStatus, MaintenanceStatus, PaymentStatus } from "@/types/database";

export interface TenantHome {
  tenantName: string;
  lease: {
    id: string;
    lease_code: string;
    status: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    security_deposit: number;
    payment_frequency: string;
    payment_method: string;
    property_name: string;
    property_address: string | null;
    unit_number: string;
  } | null;
  nextInstalment: { id: string; due_date: string; outstanding_amount: number; status: InstalmentStatus } | null;
  totals: { outstanding: number; overdue: number; paidToDate: number };
  openRequests: number;
  pendingPayments: number;
  bankAccount: { bank_name: string; account_name: string; iban: string | null } | null;
  paymentReference: string | null;
}

/**
 * Everything the tenant home screen needs, resolved from the tenant record
 * linked to the signed-in profile. RLS independently restricts every table
 * here to this tenant's own rows.
 */
export async function getTenantHome(organisationId: string, tenantId: string): Promise<TenantHome> {
  const supabase = await createClient();

  const [{ data: tenant }, { data: leases }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase
      .from("leases")
      .select(
        `id, lease_code, status, start_date, end_date, monthly_rent, security_deposit,
         payment_frequency, payment_method, properties ( name, address ), units ( unit_number )`
      )
      .eq("tenant_id", tenantId)
      .in("status", ["active", "expiring", "renewal_offered", "pending"])
      .order("start_date", { ascending: false })
      .limit(1),
  ]);

  const leaseRow = leases?.[0] ?? null;

  if (!leaseRow) {
    return {
      tenantName: tenant?.name ?? "",
      lease: null,
      nextInstalment: null,
      totals: { outstanding: 0, overdue: 0, paidToDate: 0 },
      openRequests: 0,
      pendingPayments: 0,
      bankAccount: null,
      paymentReference: null,
    };
  }

  const property = Array.isArray(leaseRow.properties) ? leaseRow.properties[0] : leaseRow.properties;
  const unit = Array.isArray(leaseRow.units) ? leaseRow.units[0] : leaseRow.units;

  const [{ data: instalments }, { data: requests }, { data: pending }, { data: bankAccounts }] =
    await Promise.all([
      supabase
        .from("rent_instalments")
        .select("id, due_date, original_amount, outstanding_amount, status")
        .eq("lease_id", leaseRow.id)
        .order("due_date"),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenantId)
        .not("status", "in", "(closed,cancelled,completed)"),
      supabase
        .from("payments")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("status", "pending_verification"),
      supabase
        .from("bank_accounts")
        .select("bank_name, account_name, iban")
        .eq("organisation_id", organisationId)
        .eq("is_default", true)
        .limit(1),
    ]);

  const instalmentRows = instalments ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const outstanding = instalmentRows.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const overdue = instalmentRows
    .filter((i) => i.due_date < today && Number(i.outstanding_amount) > 0)
    .reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const paidToDate = instalmentRows.reduce(
    (s, i) => s + (Number(i.original_amount) - Number(i.outstanding_amount)),
    0
  );

  const next = instalmentRows.find((i) => Number(i.outstanding_amount) > 0) ?? null;

  return {
    tenantName: tenant?.name ?? "",
    lease: {
      id: leaseRow.id,
      lease_code: leaseRow.lease_code,
      status: leaseRow.status,
      start_date: leaseRow.start_date,
      end_date: leaseRow.end_date,
      monthly_rent: Number(leaseRow.monthly_rent),
      security_deposit: Number(leaseRow.security_deposit),
      payment_frequency: leaseRow.payment_frequency,
      payment_method: leaseRow.payment_method,
      property_name: property?.name ?? "—",
      property_address: property?.address ?? null,
      unit_number: unit?.unit_number ?? "—",
    },
    nextInstalment: next
      ? {
          id: next.id,
          due_date: next.due_date,
          outstanding_amount: Number(next.outstanding_amount),
          status: next.status,
        }
      : null,
    totals: { outstanding, overdue, paidToDate },
    openRequests: requests?.length ?? 0,
    pendingPayments: pending?.length ?? 0,
    bankAccount: bankAccounts?.[0] ?? null,
    // A stable, human-quotable reference so the finance team can match the
    // transfer on the bank statement to this lease.
    paymentReference: `${leaseRow.lease_code}`,
  };
}

export async function getTenantRentSchedule(tenantId: string) {
  const supabase = await createClient();

  const { data: leases } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "expiring", "renewal_offered", "pending"]);

  const leaseIds = (leases ?? []).map((l) => l.id);
  if (leaseIds.length === 0) return [];

  const { data } = await supabase
    .from("rent_instalments")
    .select("id, instalment_number, due_date, original_amount, outstanding_amount, status")
    .in("lease_id", leaseIds)
    .order("due_date");

  return (data ?? []).map((i) => ({
    ...i,
    original_amount: Number(i.original_amount),
    outstanding_amount: Number(i.outstanding_amount),
  }));
}

export interface TenantPaymentRow {
  id: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  reference: string | null;
  paid_at: string;
  rejected_reason: string | null;
  receipt_number: string | null;
}

export async function getTenantPayments(tenantId: string): Promise<TenantPaymentRow[]> {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, status, reference, paid_at, rejected_reason")
    .eq("tenant_id", tenantId)
    .order("paid_at", { ascending: false });

  const ids = (payments ?? []).map((p) => p.id);
  const receiptByPayment = new Map<string, string>();
  if (ids.length > 0) {
    const { data: receipts } = await supabase
      .from("receipts")
      .select("payment_id, receipt_number")
      .in("payment_id", ids);
    for (const r of receipts ?? []) receiptByPayment.set(r.payment_id, r.receipt_number);
  }

  return (payments ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    status: p.status,
    reference: p.reference,
    paid_at: p.paid_at,
    rejected_reason: p.rejected_reason,
    receipt_number: receiptByPayment.get(p.id) ?? null,
  }));
}

export interface TenantMaintenanceRow {
  id: string;
  request_code: string;
  description: string;
  priority: string;
  status: MaintenanceStatus;
  created_at: string;
  category_name: string | null;
  latestUpdate: string | null;
}

export async function getTenantMaintenance(tenantId: string): Promise<TenantMaintenanceRow[]> {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select("id, request_code, description, priority, status, created_at, maintenance_categories ( name )")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const ids = (requests ?? []).map((r) => r.id);
  const latestByRequest = new Map<string, string>();
  if (ids.length > 0) {
    // Only non-internal comments — internal notes stay invisible to tenants,
    // enforced by RLS as well as this filter.
    const { data: comments } = await supabase
      .from("maintenance_comments")
      .select("maintenance_request_id, body, created_at")
      .in("maintenance_request_id", ids)
      .eq("is_internal", false)
      .order("created_at", { ascending: false });

    for (const c of comments ?? []) {
      if (!latestByRequest.has(c.maintenance_request_id)) {
        latestByRequest.set(c.maintenance_request_id, c.body);
      }
    }
  }

  return (requests ?? []).map((r) => {
    const category = Array.isArray(r.maintenance_categories) ? r.maintenance_categories[0] : r.maintenance_categories;
    return {
      id: r.id,
      request_code: r.request_code,
      description: r.description,
      priority: r.priority,
      status: r.status,
      created_at: r.created_at,
      category_name: category?.name ?? null,
      latestUpdate: latestByRequest.get(r.id) ?? null,
    };
  });
}

export async function getTenantRenewalOffer(tenantId: string) {
  const supabase = await createClient();

  const { data: leases } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "expiring", "renewal_offered"]);

  const leaseIds = (leases ?? []).map((l) => l.id);
  if (leaseIds.length === 0) return null;

  const { data } = await supabase
    .from("lease_renewal_offers")
    .select("id, new_start_date, new_end_date, new_monthly_rent, new_security_deposit, notes, status")
    .in("lease_id", leaseIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  const offer = data?.[0];
  return offer
    ? {
        ...offer,
        new_monthly_rent: Number(offer.new_monthly_rent),
        new_security_deposit: offer.new_security_deposit === null ? null : Number(offer.new_security_deposit),
      }
    : null;
}

export async function getTenantDocuments(tenantId: string) {
  const supabase = await createClient();

  const [{ data: tenantDocs }, { data: leases }] = await Promise.all([
    supabase
      .from("tenant_documents")
      .select("id, title, category, storage_path, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase.from("leases").select("id").eq("tenant_id", tenantId),
  ]);

  const leaseIds = (leases ?? []).map((l) => l.id);
  let leaseDocs: { id: string; title: string; storage_path: string | null; created_at: string }[] = [];
  if (leaseIds.length > 0) {
    const { data } = await supabase
      .from("lease_documents")
      .select("id, title, storage_path, created_at")
      .in("lease_id", leaseIds)
      .order("created_at", { ascending: false });
    leaseDocs = data ?? [];
  }

  return {
    tenantDocuments: tenantDocs ?? [],
    leaseDocuments: leaseDocs,
  };
}

/** Units the tenant can raise a maintenance request against (their own leases). */
export async function getTenantUnits(tenantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leases")
    .select("unit_id, units ( unit_number ), properties ( name )")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "expiring", "renewal_offered"]);

  return (data ?? []).map((l) => {
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;
    const property = Array.isArray(l.properties) ? l.properties[0] : l.properties;
    return {
      id: l.unit_id,
      label: [property?.name, unit?.unit_number].filter(Boolean).join(" · "),
    };
  });
}
