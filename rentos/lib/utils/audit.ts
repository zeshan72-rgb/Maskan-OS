import { createClient } from "@/lib/supabase/server";

/**
 * Writes an audit entry for a critical operation. Called from server actions
 * after the mutation succeeds. Failures here are logged but never block the
 * user's action — an audit write failing shouldn't roll back a rent payment.
 */
export async function recordAudit(params: {
  organisationId: string;
  action: string;
  entityTable: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.rpc("write_audit_log", {
      p_org_id: params.organisationId,
      p_action: params.action,
      p_entity_table: params.entityTable,
      p_entity_id: params.entityId ?? null,
      p_metadata: (params.metadata ?? {}) as never,
    });
  } catch (error) {
    console.error("[rentos] audit write failed", params.action, error);
  }
}
