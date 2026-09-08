"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Ban, CheckCircle2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateChequeStatusAction } from "@/features/payments/actions-cheques";
import type { ChequeStatus } from "@/types/database";

/**
 * Renders only the transitions that are actually legal from the cheque's
 * current status — the same rules the database enforces, so the UI never
 * offers an action that would be rejected.
 */
const NEXT_STATUSES: Record<ChequeStatus, ChequeStatus[]> = {
  received: ["stored", "submitted", "cancelled"],
  stored: ["submitted", "cancelled"],
  due_soon: ["submitted", "cancelled"],
  submitted: ["cleared", "bounced", "cancelled"],
  bounced: ["cancelled"],
  cleared: [],
  replaced: [],
  cancelled: [],
};

const LABELS: Record<ChequeStatus, { label: string; icon: typeof Send; variant: "default" | "outline" | "destructive" }> = {
  stored: { label: "Mark stored", icon: Archive, variant: "outline" },
  due_soon: { label: "Mark due soon", icon: Archive, variant: "outline" },
  submitted: { label: "Submit to bank", icon: Send, variant: "default" },
  cleared: { label: "Mark cleared", icon: CheckCircle2, variant: "default" },
  bounced: { label: "Mark bounced", icon: XCircle, variant: "destructive" },
  cancelled: { label: "Cancel cheque", icon: Ban, variant: "outline" },
  received: { label: "Mark received", icon: Archive, variant: "outline" },
  replaced: { label: "Mark replaced", icon: Archive, variant: "outline" },
};

export function ChequeStatusActions({
  chequeId,
  status,
  canManage,
}: {
  chequeId: string;
  status: ChequeStatus;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  if (!canManage) return null;

  const available = NEXT_STATUSES[status] ?? [];
  if (available.length === 0) {
    return <p className="text-xs text-neutral-400">This cheque has reached a final status.</p>;
  }

  function advance(next: ChequeStatus) {
    startTransition(async () => {
      const result = await updateChequeStatusAction(chequeId, next);
      if (result.status === "success") {
        toast.success(result.message ?? "Cheque updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update the cheque.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {available.map((next) => {
        const meta = LABELS[next];
        const Icon = meta.icon;

        // Clearing and bouncing both have financial consequences, so they go
        // behind a confirmation rather than a single click.
        if (next === "cleared" || next === "bounced") {
          return (
            <ConfirmDialog
              key={next}
              trigger={
                <Button variant={meta.variant} size="sm">
                  <Icon className="h-4 w-4" /> {meta.label}
                </Button>
              }
              title={next === "cleared" ? "Mark this cheque as cleared?" : "Mark this cheque as bounced?"}
              description={
                next === "cleared"
                  ? "A confirmed payment will be created and allocated to the linked rent instalment."
                  : "The tenant will be notified and the rent will remain outstanding. You can record a replacement cheque afterwards."
              }
              confirmLabel={meta.label}
              destructive={next === "bounced"}
              action={async () => updateChequeStatusAction(chequeId, next, notes)}
              onDone={() => router.refresh()}
            >
              <Field name="cheque_notes" label="Notes">
                <Textarea
                  id="cheque_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={next === "bounced" ? "Reason given by the bank…" : "Reference or clearing date…"}
                />
              </Field>
            </ConfirmDialog>
          );
        }

        return (
          <Button key={next} variant={meta.variant} size="sm" onClick={() => advance(next)} loading={pending}>
            <Icon className="h-4 w-4" /> {meta.label}
          </Button>
        );
      })}
    </div>
  );
}
