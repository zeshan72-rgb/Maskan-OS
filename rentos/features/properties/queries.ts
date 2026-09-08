import { createClient } from "@/lib/supabase/server";
import type { PropertyType, UnitStatus } from "@/types/database";

export const PAGE_SIZE = 20;

export interface PropertyListRow {
  id: string;
  name: string;
  property_code: string;
  type: PropertyType;
  address: string | null;
  unit_count: number;
  occupied_count: number;
  owner_names: string[];
}

export interface PropertyListParams {
  organisationId: string;
  q?: string;
  type?: string;
  page?: number;
}

/**
 * Lists properties with their unit counts and owners.
 *
 * Avoiding N+1: the units and property_owners are fetched in two batched
 * queries keyed by the page's property ids, rather than one query per row.
 */
export async function listProperties(params: PropertyListParams): Promise<{
  rows: PropertyListRow[];
  total: number;
  page: number;
}> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("properties")
    .select("id, name, property_code, type, address", { count: "exact" })
    .eq("organisation_id", params.organisationId)
    .is("archived_at", null);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`name.ilike.${term},property_code.ilike.${term},address.ilike.${term}`);
  }
  if (params.type) {
    query = query.eq("type", params.type as PropertyType);
  }

  const { data, count, error } = await query.order("name").range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const properties = data ?? [];
  const ids = properties.map((p) => p.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  const [{ data: units }, { data: owners }] = await Promise.all([
    supabase.from("units").select("property_id, status").in("property_id", ids).is("archived_at", null),
    supabase.from("property_owners").select("property_id, owners ( name )").in("property_id", ids),
  ]);

  const unitCounts = new Map<string, { total: number; occupied: number }>();
  for (const u of units ?? []) {
    const entry = unitCounts.get(u.property_id) ?? { total: 0, occupied: 0 };
    entry.total += 1;
    if (u.status === "occupied") entry.occupied += 1;
    unitCounts.set(u.property_id, entry);
  }

  const ownerNames = new Map<string, string[]>();
  for (const row of owners ?? []) {
    const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
    if (!owner?.name) continue;
    ownerNames.set(row.property_id, [...(ownerNames.get(row.property_id) ?? []), owner.name]);
  }

  return {
    rows: properties.map((p) => ({
      ...p,
      unit_count: unitCounts.get(p.id)?.total ?? 0,
      occupied_count: unitCounts.get(p.id)?.occupied ?? 0,
      owner_names: ownerNames.get(p.id) ?? [],
    })),
    total: count ?? 0,
    page,
  };
}

export interface PropertyDetail {
  id: string;
  organisation_id: string;
  name: string;
  property_code: string;
  type: PropertyType;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  management_fee_type: string | null;
  management_fee_value: number | null;
  owners: { id: string; name: string; ownership_percentage: number }[];
  stats: {
    units: number;
    occupied: number;
    vacant: number;
    activeLeases: number;
    monthlyRent: number;
  };
}

export async function getProperty(organisationId: string, propertyId: string): Promise<PropertyDetail | null> {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, organisation_id, name, property_code, type, address, description, latitude, longitude, management_fee_type, management_fee_value")
    .eq("id", propertyId)
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .maybeSingle();

  if (!property) return null;

  const [{ data: owners }, { data: units }, { data: leases }] = await Promise.all([
    supabase.from("property_owners").select("ownership_percentage, owners ( id, name )").eq("property_id", propertyId),
    supabase.from("units").select("id, status").eq("property_id", propertyId).is("archived_at", null),
    supabase.from("leases").select("id, monthly_rent, status").eq("property_id", propertyId).eq("status", "active"),
  ]);

  const unitRows = units ?? [];

  return {
    ...property,
    owners: (owners ?? [])
      .map((row) => {
        const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
        return owner ? { id: owner.id, name: owner.name, ownership_percentage: row.ownership_percentage } : null;
      })
      .filter((o): o is { id: string; name: string; ownership_percentage: number } => o !== null),
    stats: {
      units: unitRows.length,
      occupied: unitRows.filter((u) => u.status === "occupied").length,
      vacant: unitRows.filter((u) => u.status === "vacant").length,
      activeLeases: (leases ?? []).length,
      monthlyRent: (leases ?? []).reduce((sum, l) => sum + Number(l.monthly_rent ?? 0), 0),
    },
  };
}

export interface UnitListRow {
  id: string;
  unit_number: string;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  unit_type: string | null;
  furnishing: string | null;
  current_rent: number | null;
  market_rent: number | null;
  status: UnitStatus;
  tenant_name: string | null;
  lease_id: string | null;
}

export async function listUnitsForProperty(
  organisationId: string,
  propertyId: string,
  opts: { q?: string; status?: string } = {}
): Promise<UnitListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("units")
    .select("id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, furnishing, current_rent, market_rent, status")
    .eq("organisation_id", organisationId)
    .eq("property_id", propertyId)
    .is("archived_at", null);

  if (opts.q) query = query.ilike("unit_number", `%${opts.q}%`);
  if (opts.status) query = query.eq("status", opts.status as UnitStatus);

  const { data: units, error } = await query.order("unit_number");
  if (error) throw error;

  const unitIds = (units ?? []).map((u) => u.id);
  if (unitIds.length === 0) return [];

  // Batched: one query for all active leases on this page of units.
  const { data: leases } = await supabase
    .from("leases")
    .select("id, unit_id, tenants ( name )")
    .in("unit_id", unitIds)
    .eq("status", "active");

  const leaseByUnit = new Map<string, { id: string; tenantName: string | null }>();
  for (const lease of leases ?? []) {
    const tenant = Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants;
    leaseByUnit.set(lease.unit_id, { id: lease.id, tenantName: tenant?.name ?? null });
  }

  return (units ?? []).map((u) => ({
    ...u,
    tenant_name: leaseByUnit.get(u.id)?.tenantName ?? null,
    lease_id: leaseByUnit.get(u.id)?.id ?? null,
  }));
}

/** Lightweight option lists used by select inputs across the app. */
export async function getPropertyOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, property_code")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

export async function getOwnerOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owners")
    .select("id, name")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}
