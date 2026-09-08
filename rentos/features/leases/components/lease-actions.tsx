"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FormBanner } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { activateLeaseAction, terminateLeaseAction, createRenewalOfferAction } from "@/features/leases/actions";
import type { LeaseStatus } from "@/types/database";

export function LeaseActions({
  leaseId,
  status,
  monthlyRent,
  endDate,
  canManage,
}: {
  leaseId: string;
  status: LeaseStatus;
  monthlyRent: number;
  endDate: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canManage) return null;

  const canActivate = ["draft", "pending"].includes(status);
  const canTerminate = ["draft", "pending", "active", "expiring", "renewal_offered"].includes(status);
  const canOfferRenewal = ["active", "expiring"].includes(status);

  function activate() {
    startTransition(async () => {
      const result = await activateLeaseAction(leaseId);
      if (result.status === "success") {
        toast.success(result.message ?? "Lease activated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not activate the lease.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canActivate && (
        <Button onClick={activate} loading={pending}>
          <CheckCircle2 className="h-4 w-4" /> Activate lease
        </Button>
      )}

      {canOfferRenewal && <RenewalOfferDialog leaseId={leaseId} monthlyRent={monthlyRent} endDate={endDate} />}

      {canTerminate && <TerminateDialog leaseId={leaseId} />}
    </div>
  );
}

function TerminateDialog({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline">
          <XCircle className="h-4 w-4" /> Terminate
        </Button>
      }
      title="Terminate this lease?"
      description="The unit will be marked vacant. Any outstanding rent stays on record — terminating a lease doesn't clear what's owed."
      confirmLabel="Terminate lease"
      action={async () => terminateLeaseAction(leaseId, reason)}
      onDone={() => router.refresh()}
    >
      <Field name="termination_reason" label="Reason">
        <Textarea
          id="termination_reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Mutual agreement, tenant relocation, breach of terms…"
        />
      </Field>
    </ConfirmDialog>
  );
}

function RenewalOfferDialog({
  leaseId,
  monthlyRent,
  endDate,
}: {
  leaseId: string;
  monthlyRent: number;
  endDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  const nextStart = new Date(endDate);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(nextStart);
  nextEnd.setFullYear(nextEnd.getFullYear() + 1);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createRenewalOfferAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Renewal offer sent.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4" /> Offer renewal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer a renewal</DialogTitle>
          <DialogDescription>
            The tenant is notified and can accept, decline, or ask to discuss. Accepting creates the successor
            lease automatically, keeping this lease&apos;s history intact.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="lease_id" value={leaseId} />
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="new_start_date" label="New start date" required error={state.fieldErrors?.new_start_date}>
              <Input id="new_start_date" name="new_start_date" type="date" defaultValue={nextStart.toISOString().slice(0, 10)} required />
            </Field>
            <Field name="new_end_date" label="New end date" required error={state.fieldErrors?.new_end_date}>
              <Input id="new_end_date" name="new_end_date" type="date" defaultValue={nextEnd.toISOString().slice(0, 10)} required />
            </Field>
            <Field name="new_monthly_rent" label="New monthly rent (QAR)" required error={state.fieldErrors?.new_monthly_rent}>
              <Input id="new_monthly_rent" name="new_monthly_rent" type="number" step="0.01" min="0" defaultValue={monthlyRent} required />
            </Field>
            <Field name="new_security_deposit" label="New deposit (QAR)" error={state.fieldErrors?.new_security_deposit}>
              <Input id="new_security_deposit" name="new_security_deposit" type="number" step="0.01" min="0" />
            </Field>
            <Field name="notes" label="Message to tenant" className="sm:col-span-2">
              <Textarea id="notes" name="notes" placeholder="We'd be glad to renew your tenancy on these terms…" />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Send offer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
