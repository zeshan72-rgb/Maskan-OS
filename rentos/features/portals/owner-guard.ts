import { requireRole } from "@/lib/permissions/guards";

/**
 * Every owner screen needs the same two things: the role check, and the
 * owner record the account is linked to. requireRole redirects a non-owner
 * to /forbidden, so callers only handle the missing-link case.
 */
export async function requireOwner() {
  const { ctx, membership } = await requireRole("property_owner");
  return { ctx, membership, ownerId: membership.ownerId };
}
