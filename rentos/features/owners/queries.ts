import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 20;

export interface OwnerListRow {
  id: string;
  name: string;
  kind: string;
  email: string | null;
  phone: string | null;
  qid_or_cr: string | null;
  property_count: number;
}

export async function listOwners(params: {
  organisationId: string;
  q?: string;
  kind?: string;
  page?: number;
}): Promise<{ rows: OwnerListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("owners")
    .select("id, name, kind, email, phone, qid_or_cr", { count: "exact" })
    .eq("organisation_id", params.organisationId)
    .is("archived_at", null);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},qid_or_cr.ilike.${term}`);
  }
  if (params.kind) query = query.eq("kind", params.kind);

  const { data, count, error } = await query.order("name").range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const owners = data ?? [];
  const ids = owners.map((o) => o.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  // Batched count of properties per owner — one query, not one per row.
  const { data: links } = await supabase.from("property_owners").select("owner_id").in("owner_id", ids);
  const counts = new Map<string, number>();
  for (const link of links ?? []) counts.set(link.owner_id, (counts.get(link.owner_id) ?? 0) + 1);

  return {
    rows: owners.map((o) => ({ ...o, property_count: counts.get(o.id) ?? 0 })),
    total: count ?? 0,
    page,
  };
}

export interface OwnerDetail {
  id: string;
  organisation_id: string;
  name: string;
  kind: string;
  qid_or_cr: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  properties: { id: string; name: string; property_code: string; ownership_percentage: number }[];
  stats: { properties: number; units: number; occupiedUnits: number; monthlyRent: number };
}

export async function getOwner(organisationId: string, ownerId: string): Promise<OwnerDetail | null> {
  const supabase = await createClient();

  const { data: owner } = await supabase
    .from("owners")
    .select("id, organisation_id, name, kind, qid_or_cr, email, phone, address, notes")
    .eq("id", ownerId)
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .maybeSingle();

  if (!owner) return null;

  const { data: links } = await supabase
    .from("property_owners")
    .select("ownership_percentage, properties ( id, name, property_code )")
    .eq("owner_id", ownerId);

  const properties = (links ?? [])
    .map((row) => {
      const p = Array.isArray(row.properties) ? row.properties[0] : row.properties;
      return p ? { ...p, ownership_percentage: row.ownership_percentage } : null;
    })
    .filter((p): p is { id: string; name: string; property_code: string; ownership_percentage: number } => p !== null);

  const propertyIds = properties.map((p) => p.id);

  let units: { status: string }[] = [];
  let monthlyRent = 0;
  if (propertyIds.length > 0) {
    const [{ data: unitRows }, { data: leaseRows }] = await Promise.all([
      supabase.from("units").select("status").in("property_id", propertyIds).is("archived_at", null),
      supabase.from("leases").select("monthly_rent").in("property_id", propertyIds).eq("status", "active"),
    ]);
    units = unitRows ?? [];
    monthlyRent = (leaseRows ?? []).reduce((sum, l) => sum + Number(l.monthly_rent ?? 0), 0);
  }

  return {
    ...owner,
    properties,
    stats: {
      properties: properties.length,
      units: units.length,
      occupiedUnits: units.filter((u) => u.status === "occupied").length,
      monthlyRent,
    },
  };
}

export interface TenantListRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qid_or_passport: string | null;
  nationality: string | null;
  lease_status: string | null;
  unit_label: string | null;
  lease_id: string | null;
}

export async function listTenants(params: {
  organisationId: string;
  q?: string;
  status?: string;
  page?: number;
}): Promise<{ rows: TenantListRow[]; total: number; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("tenants")
    .select("id, name, email, phone, qid_or_passport, nationality", { count: "exact" })
    .eq("organisation_id", params.organisationId)
    .is("archived_at", null);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},qid_or_passport.ilike.${term}`);
  }

  const { data, count, error } = await query.order("name").range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const tenants = data ?? [];
  const ids = tenants.map((t) => t.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  const { data: leases } = await supabase
    .from("leases")
    .select("id, tenant_id, status, units ( unit_number ), properties ( name )")
    .in("tenant_id", ids)
    .in("status", ["active", "expiring", "renewal_offered", "pending"]);

  const leaseByTenant = new Map<string, { id: string; status: string; label: string }>();
  for (const lease of leases ?? []) {
    const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units;
    const property = Array.isArray(lease.properties) ? lease.properties[0] : lease.properties;
    leaseByTenant.set(lease.tenant_id, {
      id: lease.id,
      status: lease.status,
      label: [property?.name, unit?.unit_number].filter(Boolean).join(" · "),
    });
  }

  let rows: TenantListRow[] = tenants.map((t) => {
    const lease = leaseByTenant.get(t.id);
    return {
      ...t,
      lease_status: lease?.status ?? null,
      unit_label: lease?.label ?? null,
      lease_id: lease?.id ?? null,
    };
  });

  // "Tenancy status" filter is applied after the lease join, since it isn't a
  // column on tenants itself.
  if (params.status === "housed") rows = rows.filter((r) => !!r.lease_id);
  if (params.status === "no_lease") rows = rows.filter((r) => !r.lease_id);

  return { rows, total: count ?? 0, page };
}

export interface TenantDetail {
  id: string;
  organisation_id: string;
  name: string;
  qid_or_passport: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  employer: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  occupants: { id: string; name: string; relationship: string | null }[];
  leases: {
    id: string;
    lease_code: string;
    status: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    unit_label: string;
  }[];
}

export async function getTenant(organisationId: string, tenantId: string): Promise<TenantDetail | null> {
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, organisation_id, name, qid_or_passport, nationality, email, phone, employer, emergency_contact_name, emergency_contact_phone, notes")
    .eq("id", tenantId)
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .maybeSingle();

  if (!tenant) return null;

  const [{ data: occupants }, { data: leases }] = await Promise.all([
    supabase.from("occupants").select("id, name, relationship").eq("tenant_id", tenantId),
    supabase
      .from("leases")
      .select("id, lease_code, status, start_date, end_date, monthly_rent, units ( unit_number ), properties ( name )")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false }),
  ]);

  return {
    ...tenant,
    occupants: occupants ?? [],
    leases: (leases ?? []).map((l) => {
      const unit = Array.isArray(l.units) ? l.units[0] : l.units;
      const property = Array.isArray(l.properties) ? l.properties[0] : l.properties;
      return {
        id: l.id,
        lease_code: l.lease_code,
        status: l.status,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: Number(l.monthly_rent),
        unit_label: [property?.name, unit?.unit_number].filter(Boolean).join(" · "),
      };
    }),
  };
}
