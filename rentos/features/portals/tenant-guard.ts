import { requireRole } from "@/lib/permissions/guards";

/**
 * Every tenant screen needs the role check and the tenant record the
 * account is linked to. requireRole redirects a non-tenant to /forbidden,
 * so callers only handle the missing-link case.
 */
export async function requireTenant() {
  const { ctx, membership } = await requireRole("tenant");
  return { ctx, membership, tenantId: membership.tenantId };
}
