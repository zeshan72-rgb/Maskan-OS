"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send, UserCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormBanner } from "@/components/shared/field";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import {
  createWorkOrderAction, updateMaintenanceStatusAction, addMaintenanceCommentAction,
} from "@/features/maintenance/actions";
import type { MaintenanceStatus } from "@/types/database";

export function AssignWorkOrderDialog({
  requestId,
  vendors,
  hasWorkOrder,
}: {
  requestId: string;
  vendors: { id: string; name: string; trade: string | null }[];
  hasWorkOrder: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createWorkOrderAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Work order created.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={hasWorkOrder ? "outline" : "default"}>
          <UserCheck className="h-4 w-4" /> {hasWorkOrder ? "Reassign" : "Assign vendor"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a work order</DialogTitle>
          <DialogDescription>
            The assigned vendor sees only this job — never other requests in your portfolio.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="maintenance_request_id" value={requestId} />
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <Field name="vendor_id" label="Vendor" hint="Leave blank to handle this with an internal team." error={state.fieldErrors?.vendor_id}>
            <Select id="vendor_id" name="vendor_id" defaultValue="">
              <option value="">No vendor — internal team</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}{v.trade ? ` · ${v.trade}` : ""}</option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="scheduled_at" label="Scheduled for" error={state.fieldErrors?.scheduled_at}>
              <Input id="scheduled_at" name="scheduled_at" type="datetime-local" />
            </Field>
            <Field name="estimated_cost" label="Estimated cost (QAR)" error={state.fieldErrors?.estimated_cost}>
              <Input id="estimated_cost" name="estimated_cost" type="number" step="0.01" min="0" />
            </Field>
            <Field name="approved_amount" label="Approved spend cap (QAR)" hint="Vendor shouldn't exceed this without approval." className="sm:col-span-2">
              <Input id="approved_amount" name="approved_amount" type="number" step="0.01" min="0" />
            </Field>
            <Field name="instructions" label="Instructions to vendor" className="sm:col-span-2">
              <Textarea id="instructions" name="instructions" placeholder="Access arrangements, parts to bring, tenant contact preferences…" />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Assign job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_FLOW: { value: MaintenanceStatus; label: string }[] = [
  { value: "reviewing", label: "Reviewing" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function MaintenanceStatusControl({
  requestId,
  status,
}: {
  requestId: string;
  status: MaintenanceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: MaintenanceStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateMaintenanceStatusAction(requestId, next);
      if (result.status === "success") {
        toast.success(result.message ?? "Updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update the request.");
      }
    });
  }

  return (
    <Select
      aria-label="Change request status"
      value={status}
      disabled={pending}
      onChange={(e) => change(e.target.value as MaintenanceStatus)}
      className="w-44"
    >
      <option value={status} disabled>
        {status.replace(/_/g, " ")}
      </option>
      {STATUS_FLOW.filter((s) => s.value !== status).map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );
}

export function MaintenanceCommentForm({
  requestId,
  allowInternal,
}: {
  requestId: string;
  allowInternal: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMaintenanceCommentAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        setBody("");
        toast.success("Comment added.");
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="maintenance_request_id" value={requestId} />
      <Field name="body" label="Add a comment" error={state.fieldErrors?.body}>
        <Textarea
          id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Update the tenant or leave a note for the team…"
        />
      </Field>

      <div className="flex items-center justify-between">
        {allowInternal ? (
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" name="is_internal" className="h-3.5 w-3.5 rounded border-neutral-300" />
            Internal note (hidden from the tenant)
          </label>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <MessageSquare className="h-3.5 w-3.5" /> Visible to your property manager
          </span>
        )}
        <Button type="submit" size="sm" loading={pending} disabled={body.trim().length < 2}>
          <Send className="h-3.5 w-3.5" /> Post
        </Button>
      </div>
    </form>
  );
}
