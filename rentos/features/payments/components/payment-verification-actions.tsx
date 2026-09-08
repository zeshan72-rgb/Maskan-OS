"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { confirmPaymentAction, rejectPaymentAction } from "@/features/payments/actions";

/**
 * Verification controls for a tenant-submitted bank transfer. The accountant
 * can correct the amount before confirming, because the uploaded receipt —
 * not the figure the tenant typed — is the source of truth.
 */
export function PaymentVerificationActions({
  paymentId,
  amount,
}: {
  paymentId: string;
  amount: number;
}) {
  const router = useRouter();
  const [confirmedAmount, setConfirmedAmount] = useState(String(amount));
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline">
            <Check className="h-3.5 w-3.5" /> Confirm
          </Button>
        }
        title="Confirm this payment?"
        description="The amount will be allocated to outstanding rent, oldest first, and a receipt will be issued."
        confirmLabel="Confirm payment"
        destructive={false}
        action={async () =>
          confirmPaymentAction(paymentId, {
            amount: Number(confirmedAmount),
            reference: reference || undefined,
          })
        }
        onDone={refresh}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="confirmed_amount" label="Confirmed amount (QAR)" hint="Adjust if the receipt shows a different figure.">
            <Input
              id="confirmed_amount" type="number" step="0.01" min="0.01"
              value={confirmedAmount} onChange={(e) => setConfirmedAmount(e.target.value)}
            />
          </Field>
          <Field name="bank_reference" label="Bank reference">
            <Input id="bank_reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        }
        title="Reject this payment?"
        description="The tenant will be notified with your reason and no rent balance will change."
        confirmLabel="Reject payment"
        action={async () => rejectPaymentAction(paymentId, reason)}
        onDone={refresh}
      >
        <Field name="rejection_reason" label="Reason" hint="Shown to the tenant.">
          <Textarea
            id="rejection_reason" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="No matching transfer found on the bank statement…"
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
