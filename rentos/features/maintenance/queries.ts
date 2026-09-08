import { createClient } from "@/lib/supabase/server";
import type { MaintenancePriority, MaintenanceStatus } from "@/types/database";

export const PAGE_SIZE = 20;

export interface MaintenanceListRow {
  id: string;
  request_code: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  created_at: string;
  property_name: string;
  unit_number: string;
  tenant_name: string | null;
  category_name: string | null;
  vendor_name: string | null;
  ageDays: number;
}

export async function listMaintenanceRequests(params: {
  organisationId: string;
  q?: string;
  status?: string;
  priority?: string;
  page?: number;
}): Promise<{ rows: MaintenanceListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("maintenance_requests")
    .select(
      `id, request_code, description, priority, status, created_at,
       properties ( name ), units ( unit_number ), tenants ( name ), maintenance_categories ( name )`,
      { count: "exact" }
    )
    .eq("organisation_id", params.organisationId);

  if (params.status) query = query.eq("status", params.status as MaintenanceStatus);
  if (params.priority) query = query.eq("priority", params.priority as MaintenancePriority);
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`request_code.ilike.${term},description.ilike.${term}`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const requests = data ?? [];
  const ids = requests.map((r) => r.id);

  // Batched work-order lookup so the list can show the assigned vendor.
  const vendorByRequest = new Map<string, string>();
  if (ids.length > 0) {
    const { data: workOrders } = await supabase
      .from("work_orders")
      .select("maintenance_request_id, vendors ( name )")
      .in("maintenance_request_id", ids);

    for (const wo of workOrders ?? []) {
      const vendor = Array.isArray(wo.vendors) ? wo.vendors[0] : wo.vendors;
      if (vendor?.name) vendorByRequest.set(wo.maintenance_request_id, vendor.name);
    }
  }

  const now = Date.now();

  return {
    rows: requests.map((r) => {
      const property = Array.isArray(r.properties) ? r.properties[0] : r.properties;
      const unit = Array.isArray(r.units) ? r.units[0] : r.units;
      const tenant = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const category = Array.isArray(r.maintenance_categories) ? r.maintenance_categories[0] : r.maintenance_categories;

      return {
        id: r.id,
        request_code: r.request_code,
        description: r.description,
        priority: r.priority,
        status: r.status,
        created_at: r.created_at,
        property_name: property?.name ?? "—",
        unit_number: unit?.unit_number ?? "—",
        tenant_name: tenant?.name ?? null,
        category_name: category?.name ?? null,
        vendor_name: vendorByRequest.get(r.id) ?? null,
        ageDays: Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000),
      };
    }),
    total: count ?? 0,
    page,
  };
}

export interface MaintenanceDetail {
  id: string;
  organisation_id: string;
  request_code: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  access_notes: string | null;
  preferred_time: string | null;
  created_at: string;
  property: { id: string; name: string } | null;
  unit: { id: string; unit_number: string } | null;
  tenant: { id: string; name: string; phone: string | null } | null;
  category_name: string | null;
  comments: { id: string; body: string; is_internal: boolean; created_at: string; author_name: string | null }[];
  attachments: { id: string; storage_path: string; stage: string | null; created_at: string }[];
  workOrder: {
    id: string;
    vendor_id: string | null;
    vendor_name: string | null;
    scheduled_at: string | null;
    estimated_cost: number | null;
    approved_amount: number | null;
    actual_amount: number | null;
    instructions: string | null;
    status: MaintenanceStatus;
    events: { id: string; event_type: string; notes: string | null; created_at: string }[];
  } | null;
}

export async function getMaintenanceRequest(
  organisationId: string,
  requestId: string
): Promise<MaintenanceDetail | null> {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("maintenance_requests")
    .select(
      `id, organisation_id, request_code, description, priority, status, access_notes, preferred_time, created_at,
       properties ( id, name ), units ( id, unit_number ), tenants ( id, name, phone ), maintenance_categories ( name )`
    )
    .eq("id", requestId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!request) return null;

  const [{ data: comments }, { data: attachments }, { data: workOrders }] = await Promise.all([
    supabase
      .from("maintenance_comments")
      .select("id, body, is_internal, created_at, author_id")
      .eq("maintenance_request_id", requestId)
      .order("created_at"),
    supabase
      .from("maintenance_attachments")
      .select("id, storage_path, stage, created_at")
      .eq("maintenance_request_id", requestId)
      .order("created_at"),
    supabase
      .from("work_orders")
      .select("id, vendor_id, scheduled_at, estimated_cost, approved_amount, actual_amount, instructions, status, vendors ( name )")
      .eq("maintenance_request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Resolve comment authors in one batched query.
  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id).filter((id): id is string => !!id)));
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
    for (const p of profiles ?? []) authorNames.set(p.id, p.full_name);
  }

  const workOrder = workOrders?.[0] ?? null;
  let workOrderEvents: { id: string; event_type: string; notes: string | null; created_at: string }[] = [];
  if (workOrder) {
    const { data: events } = await supabase
      .from("work_order_events")
      .select("id, event_type, notes, created_at")
      .eq("work_order_id", workOrder.id)
      .order("created_at");
    workOrderEvents = events ?? [];
  }

  const property = Array.isArray(request.properties) ? request.properties[0] : request.properties;
  const unit = Array.isArray(request.units) ? request.units[0] : request.units;
  const tenant = Array.isArray(request.tenants) ? request.tenants[0] : request.tenants;
  const category = Array.isArray(request.maintenance_categories)
    ? request.maintenance_categories[0]
    : request.maintenance_categories;
  const vendor = workOrder
    ? (Array.isArray(workOrder.vendors) ? workOrder.vendors[0] : workOrder.vendors)
    : null;

  return {
    id: request.id,
    organisation_id: request.organisation_id,
    request_code: request.request_code,
    description: request.description,
    priority: request.priority,
    status: request.status,
    access_notes: request.access_notes,
    preferred_time: request.preferred_time,
    created_at: request.created_at,
    property: property ?? null,
    unit: unit ?? null,
    tenant: tenant ?? null,
    category_name: category?.name ?? null,
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      is_internal: c.is_internal,
      created_at: c.created_at,
      author_name: c.author_id ? (authorNames.get(c.author_id) ?? null) : null,
    })),
    attachments: attachments ?? [],
    workOrder: workOrder
      ? {
          id: workOrder.id,
          vendor_id: workOrder.vendor_id,
          vendor_name: vendor?.name ?? null,
          scheduled_at: workOrder.scheduled_at,
          estimated_cost: workOrder.estimated_cost === null ? null : Number(workOrder.estimated_cost),
          approved_amount: workOrder.approved_amount === null ? null : Number(workOrder.approved_amount),
          actual_amount: workOrder.actual_amount === null ? null : Number(workOrder.actual_amount),
          instructions: workOrder.instructions,
          status: workOrder.status,
          events: workOrderEvents,
        }
      : null,
  };
}

export async function getMaintenanceCategories(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_categories")
    .select("id, name, organisation_id")
    .or(`organisation_id.is.null,organisation_id.eq.${organisationId}`)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getVendorOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, name, trade")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

export interface VendorJobRow {
  workOrderId: string;
  requestId: string;
  request_code: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduled_at: string | null;
  estimated_cost: number | null;
  approved_amount: number | null;
  actual_amount: number | null;
  instructions: string | null;
  property_name: string;
  unit_number: string;
  access_notes: string | null;
}

/**
 * Jobs assigned to a specific vendor. Scoped by vendor_id at the query level
 * *and* by RLS — a vendor can never see another vendor's work orders, or any
 * maintenance request that hasn't been assigned to them.
 */
export async function listVendorJobs(vendorId: string): Promise<VendorJobRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_orders")
    .select(
      `id, status, scheduled_at, estimated_cost, approved_amount, actual_amount, instructions, maintenance_request_id,
       maintenance_requests ( id, request_code, description, priority, access_notes, properties ( name ), units ( unit_number ) )`
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((wo) => {
    const request = Array.isArray(wo.maintenance_requests) ? wo.maintenance_requests[0] : wo.maintenance_requests;
    const property = request && "properties" in request
      ? (Array.isArray(request.properties) ? request.properties[0] : request.properties)
      : null;
    const unit = request && "units" in request
      ? (Array.isArray(request.units) ? request.units[0] : request.units)
      : null;

    return {
      workOrderId: wo.id,
      requestId: wo.maintenance_request_id,
      request_code: request?.request_code ?? "—",
      description: request?.description ?? "",
      priority: request?.priority ?? "normal",
      status: wo.status,
      scheduled_at: wo.scheduled_at,
      estimated_cost: wo.estimated_cost === null ? null : Number(wo.estimated_cost),
      approved_amount: wo.approved_amount === null ? null : Number(wo.approved_amount),
      actual_amount: wo.actual_amount === null ? null : Number(wo.actual_amount),
      instructions: wo.instructions,
      property_name: property?.name ?? "—",
      unit_number: unit?.unit_number ?? "—",
      access_notes: request?.access_notes ?? null,
    };
  });
}
