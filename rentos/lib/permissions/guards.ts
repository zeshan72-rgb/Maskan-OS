import { redirect } from "next/navigation";
import {
  getSessionContext,
  primaryMembership,
  type OrgMembershipContext,
  type SessionContext,
} from "./context";
import type { MemberRoleKey } from "@/types/database";

/**
 * Where a signed-in user should land, based on the roles they hold.
 * Portal roles take precedence over staff roles because a tenant/owner/vendor
 * account should never be dropped into the manager application, even if
 * some future custom role also grants them staff-ish permissions.
 */
export function landingPathFor(ctx: SessionContext): string {
  if (ctx.isPlatformSuperAdmin) return "/admin";

  const membership = primaryMembership(ctx);
  if (!membership) return "/no-organisation";

  const roles = membership.roleKeys;
  if (roles.includes("tenant")) return "/tenant";
  if (roles.includes("property_owner")) return "/owner";
  if (roles.includes("vendor")) return "/vendor";
  return "/dashboard";
}

const STAFF_ROLES: MemberRoleKey[] = [
  "org_owner",
  "org_admin",
  "property_manager",
  "accountant",
  "maintenance_manager",
  "staff",
];

export interface StaffGuardResult {
  ctx: SessionContext;
  membership: OrgMembershipContext;
}

/** Guards the manager application. Redirects portal users to their own portal. */
export async function requireStaff(): Promise<StaffGuardResult> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const membership = primaryMembership(ctx);
  if (!membership) redirect("/no-organisation");

  const isStaff = ctx.isPlatformSuperAdmin || membership.roleKeys.some((r) => STAFF_ROLES.includes(r));
  if (!isStaff) redirect(landingPathFor(ctx));

  return { ctx, membership };
}

/** Guards a specific portal namespace. */
export async function requireRole(role: MemberRoleKey): Promise<StaffGuardResult> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const membership = primaryMembership(ctx);
  if (!membership) redirect("/no-organisation");

  if (!ctx.isPlatformSuperAdmin && !membership.roleKeys.includes(role)) {
    redirect("/forbidden");
  }
  return { ctx, membership };
}

export async function requirePlatformSuperAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.isPlatformSuperAdmin) redirect("/forbidden");
  return ctx;
}

/**
 * Used inside server actions. Throws rather than redirects so the calling
 * action can return a structured error to the form. RLS is still the real
 * enforcement — this produces a clean message instead of a raw DB error.
 */
export class PermissionError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export async function assertPermission(organisationId: string, code: string): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new PermissionError("You must be signed in.");
  if (ctx.isPlatformSuperAdmin) return ctx;

  const membership = ctx.memberships.find((m) => m.organisationId === organisationId);
  if (!membership) throw new PermissionError("You do not have access to this organisation.");
  if (!membership.permissionCodes.includes(code)) throw new PermissionError();

  return ctx;
}
