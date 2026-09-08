import { createClient } from "@/lib/supabase/server";
import type { MemberRoleKey } from "@/types/database";
import { cache } from "react";

export interface OrgMembershipContext {
  organisationId: string;
  organisationMemberId: string;
  organisationName: string;
  organisationSlug: string;
  roleKeys: MemberRoleKey[];
  permissionCodes: string[];
  ownerId: string | null;
  tenantId: string | null;
  vendorId: string | null;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  fullName: string;
  isPlatformSuperAdmin: boolean;
  memberships: OrgMembershipContext[];
}

/**
 * Loads the full permission context for the signed-in user: every
 * organisation they belong to, the roles they hold in each, and the
 * flattened permission codes those roles grant. Cached per-request so
 * repeated calls across server components/actions don't re-query.
 *
 * This mirrors the RLS helper functions (is_org_member/has_role/
 * has_permission) so the UI can hide controls the database would reject
 * anyway — but every mutating server action re-checks against the database
 * via RLS as the actual enforcement point, never trusting this alone.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, is_platform_super_admin")
    .eq("id", user.id)
    .single();

  const { data: members } = await supabase
    .from("organisation_members")
    .select(
      `id, organisation_id, owner_id, tenant_id, vendor_id,
       organisations ( name, slug ),
       member_roles ( roles ( key ), role_id ) `
    )
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const memberships: OrgMembershipContext[] = [];

  for (const m of members ?? []) {
    const org = Array.isArray(m.organisations) ? m.organisations[0] : m.organisations;
    const roleRows = (m.member_roles ?? []) as unknown as { role_id: string; roles: { key: MemberRoleKey | null } | null }[];
    const roleIds = roleRows.map((r) => r.role_id);
    const roleKeys = roleRows.map((r) => r.roles?.key).filter((k): k is MemberRoleKey => !!k);

    let permissionCodes: string[] = [];
    if (roleIds.length > 0) {
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permissions ( code )")
        .in("role_id", roleIds);
      permissionCodes = (perms ?? [])
        .map((p) => (Array.isArray(p.permissions) ? p.permissions[0]?.code : (p.permissions as { code: string } | null)?.code))
        .filter((c): c is string => !!c);
    }

    memberships.push({
      organisationId: m.organisation_id,
      organisationMemberId: m.id,
      organisationName: org?.name ?? "",
      organisationSlug: org?.slug ?? "",
      roleKeys,
      permissionCodes,
      ownerId: m.owner_id,
      tenantId: m.tenant_id,
      vendorId: m.vendor_id,
    });
  }

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? "",
    isPlatformSuperAdmin: profile?.is_platform_super_admin ?? false,
    memberships,
  };
});

export function hasRole(ctx: SessionContext | null, organisationId: string, ...roleKeys: MemberRoleKey[]): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformSuperAdmin) return true;
  const m = ctx.memberships.find((x) => x.organisationId === organisationId);
  return !!m && m.roleKeys.some((r) => roleKeys.includes(r));
}

export function hasPermission(ctx: SessionContext | null, organisationId: string, code: string): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformSuperAdmin) return true;
  const m = ctx.memberships.find((x) => x.organisationId === organisationId);
  return !!m && m.permissionCodes.includes(code);
}

export function primaryMembership(ctx: SessionContext | null): OrgMembershipContext | null {
  return ctx?.memberships[0] ?? null;
}
