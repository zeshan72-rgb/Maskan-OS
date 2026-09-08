"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";

export type SearchEntity =
  | "tenant" | "property" | "unit" | "owner" | "lease" | "cheque" | "payment" | "maintenance";

export interface SearchResult {
  id: string;
  entity: SearchEntity;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchGroup {
  entity: SearchEntity;
  label: string;
  results: SearchResult[];
}

const GROUP_LABELS: Record<SearchEntity, string> = {
  tenant: "Tenants",
  property: "Properties",
  unit: "Units",
  owner: "Owners",
  lease: "Leases",
  cheque: "Cheques",
  payment: "Payments",
  maintenance: "Maintenance",
};

const PER_ENTITY_LIMIT = 5;

/**
 * Cross-entity search for the command menu.
 *
 * Every query is filtered by organisation_id and additionally governed by
 * RLS, so results can never cross an organisation boundary — searching is
 * not a way around tenancy isolation. Queries run in parallel and each is
 * capped, so a broad term stays fast.
 */
export async function globalSearch(term: string): Promise<SearchGroup[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!ctx || !membership) return [];

  const organisationId = membership.organisationId;
  const supabase = await createClient();
  const pattern = `%${trimmed}%`;

  const [tenants, properties, units, owners, leases, cheques, payments, maintenance] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, phone, qid_or_passport, email")
      .eq("organisation_id", organisationId)
      .is("archived_at", null)
      .or(`name.ilike.${pattern},phone.ilike.${pattern},qid_or_passport.ilike.${pattern},email.ilike.${pattern}`)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("properties")
      .select("id, name, property_code, address")
      .eq("organisation_id", organisationId)
      .is("archived_at", null)
      .or(`name.ilike.${pattern},property_code.ilike.${pattern},address.ilike.${pattern}`)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("units")
      .select("id, unit_number, property_id, status, properties ( name )")
      .eq("organisation_id", organisationId)
      .is("archived_at", null)
      .ilike("unit_number", pattern)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("owners")
      .select("id, name, qid_or_cr, phone, email")
      .eq("organisation_id", organisationId)
      .is("archived_at", null)
      .or(`name.ilike.${pattern},qid_or_cr.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("leases")
      .select("id, lease_code, status, tenants ( name ), units ( unit_number )")
      .eq("organisation_id", organisationId)
      .ilike("lease_code", pattern)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("cheques")
      .select("id, cheque_number, bank_name, amount, status")
      .eq("organisation_id", organisationId)
      .or(`cheque_number.ilike.${pattern},bank_name.ilike.${pattern},payer_name.ilike.${pattern}`)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("payments")
      .select("id, reference, amount, paid_at, lease_id")
      .eq("organisation_id", organisationId)
      .ilike("reference", pattern)
      .limit(PER_ENTITY_LIMIT),

    supabase
      .from("maintenance_requests")
      .select("id, request_code, description, status")
      .eq("organisation_id", organisationId)
      .or(`request_code.ilike.${pattern},description.ilike.${pattern}`)
      .limit(PER_ENTITY_LIMIT),
  ]);

  const groups: SearchGroup[] = [];

  function push(entity: SearchEntity, results: SearchResult[]) {
    if (results.length > 0) groups.push({ entity, label: GROUP_LABELS[entity], results });
  }

  push("tenant", (tenants.data ?? []).map((t) => ({
    id: t.id, entity: "tenant" as const, title: t.name,
    subtitle: [t.phone, t.qid_or_passport].filter(Boolean).join(" · ") || null,
    href: `/tenants/${t.id}`,
  })));

  push("property", (properties.data ?? []).map((p) => ({
    id: p.id, entity: "property" as const, title: p.name,
    subtitle: [p.property_code, p.address].filter(Boolean).join(" · ") || null,
    href: `/properties/${p.id}`,
  })));

  push("unit", (units.data ?? []).map((u) => {
    const property = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    return {
      id: u.id, entity: "unit" as const, title: `Unit ${u.unit_number}`,
      subtitle: [property?.name, u.status].filter(Boolean).join(" · ") || null,
      href: `/properties/${u.property_id}/units`,
    };
  }));

  push("owner", (owners.data ?? []).map((o) => ({
    id: o.id, entity: "owner" as const, title: o.name,
    subtitle: [o.qid_or_cr, o.phone].filter(Boolean).join(" · ") || null,
    href: `/owners/${o.id}`,
  })));

  push("lease", (leases.data ?? []).map((l) => {
    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;
    return {
      id: l.id, entity: "lease" as const, title: l.lease_code,
      subtitle: [tenant?.name, unit?.unit_number ? `Unit ${unit.unit_number}` : null, l.status]
        .filter(Boolean).join(" · ") || null,
      href: `/leases/${l.id}`,
    };
  }));

  push("cheque", (cheques.data ?? []).map((c) => ({
    id: c.id, entity: "cheque" as const, title: `Cheque ${c.cheque_number}`,
    subtitle: [c.bank_name, `QAR ${Number(c.amount).toLocaleString()}`, c.status].filter(Boolean).join(" · "),
    href: `/payments/cheques/${c.id}`,
  })));

  push("payment", (payments.data ?? []).map((p) => ({
    id: p.id, entity: "payment" as const, title: p.reference ?? "Payment",
    subtitle: `QAR ${Number(p.amount).toLocaleString()} · ${p.paid_at}`,
    href: `/leases/${p.lease_id}`,
  })));

  push("maintenance", (maintenance.data ?? []).map((m) => ({
    id: m.id, entity: "maintenance" as const, title: m.request_code,
    subtitle: m.description.slice(0, 60),
    href: `/maintenance/${m.id}`,
  })));

  return groups;
}
