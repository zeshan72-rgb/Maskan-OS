"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Check, MapPin, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Field } from "@/components/shared/field";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { vendorUpdateJobAction } from "@/features/maintenance/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { VendorJobRow } from "@/features/maintenance/types";
import { MAINTENANCE_PRIORITIES } from "@/lib/validation/maintenance";

const PRIORITY_VARIANT = {
  low: "outline", normal: "neutral", high: "warning", emergency: "danger",
} as const;

/**
 * Mobile-first job card. Technicians work from a phone on site, so the
 * primary action for the job's current stage is a full-width button and
 * everything else is secondary.
 */
export function VendorJobCard({ job }: { job: VendorJobRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(event: "accepted" | "arrived" | "started", notes?: string) {
    startTransition(async () => {
      const result = await vendorUpdateJobAction(job.workOrderId, event, { notes });
      if (result.status === "success") {
        toast.success(result.message ?? "Job updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update the job.");
      }
    });
  }

  const isNew = job.status === "assigned";
  const isScheduled = job.status === "scheduled";
  const isActive = job.status === "in_progress";
  const isDone = ["completed", "closed"].includes(job.status);

  return (
    <Card className="animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{job.request_code}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant={PRIORITY_VARIANT[job.priority]}>
              {MAINTENANCE_PRIORITIES.find((p) => p.value === job.priority)?.label}
            </Badge>
            <StatusBadge status={job.status} />
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <MapPin className="h-3.5 w-3.5" />
          {job.property_name} · Unit {job.unit_number}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-neutral-800">{job.description}</p>

        {job.access_notes && (
          <p className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
            <strong className="font-medium text-neutral-800">Access:</strong> {job.access_notes}
          </p>
        )}
        {job.instructions && (
          <p className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
            <strong className="font-medium text-neutral-800">Instructions:</strong> {job.instructions}
          </p>
        )}

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {job.scheduled_at && (
            <div>
              <dt className="text-neutral-500">Scheduled</dt>
              <dd className="font-medium text-neutral-800">{formatDateTime(job.scheduled_at)}</dd>
            </div>
          )}
          {job.approved_amount !== null && (
            <div>
              <dt className="text-neutral-500">Approved cap</dt>
              <dd className="font-medium tabular-nums text-neutral-800">{formatCurrency(job.approved_amount)}</dd>
            </div>
          )}
          {job.actual_amount !== null && (
            <div>
              <dt className="text-neutral-500">Final cost</dt>
              <dd className="font-medium tabular-nums text-neutral-800">{formatCurrency(job.actual_amount)}</dd>
            </div>
          )}
        </dl>

        {!isDone && (
          <div className="flex flex-wrap gap-2 pt-1">
            {isNew && (
              <>
                <Button className="flex-1" onClick={() => update("accepted")} loading={pending}>
                  <Check className="h-4 w-4" /> Accept job
                </Button>
                <RejectJobDialog workOrderId={job.workOrderId} />
              </>
            )}

            {(isNew || isScheduled) && <ScheduleJobDialog workOrderId={job.workOrderId} />}

            {isScheduled && (
              <Button className="flex-1" variant="outline" onClick={() => update("arrived")} loading={pending}>
                <MapPin className="h-4 w-4" /> Mark arrived
              </Button>
            )}

            {(isScheduled || isActive) && (
              <Button className="flex-1" variant={isActive ? "outline" : "default"} onClick={() => update("started")} loading={pending}>
                <Play className="h-4 w-4" /> Work started
              </Button>
            )}

            {isActive && <CompleteJobDialog workOrderId={job.workOrderId} approvedAmount={job.approved_amount} />}
          </div>
        )}

        {isDone && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Job completed. The property manager will review and close the request.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RejectJobDialog({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function reject() {
    startTransition(async () => {
      const result = await vendorUpdateJobAction(workOrderId, "rejected", { notes: reason });
      if (result.status === "success") {
        toast.success("Job declined. The manager has been notified.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not decline the job.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <X className="h-4 w-4" /> Decline
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline this job?</DialogTitle>
          <DialogDescription>
            The request goes back to the property manager to reassign. Please say why so they can act quickly.
          </DialogDescription>
        </DialogHeader>
        <Field name="reject_reason" label="Reason" required>
          <Textarea
            id="reject_reason" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="No availability this week / outside our trade / parts unavailable…"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={reject} loading={pending} disabled={reason.trim().length < 3}>
            Decline job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleJobDialog({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [pending, startTransition] = useTransition();

  function schedule() {
    startTransition(async () => {
      const result = await vendorUpdateJobAction(workOrderId, "scheduled", { scheduledAt: when });
      if (result.status === "success") {
        toast.success("Visit scheduled.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not schedule the visit.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1">
          <CalendarClock className="h-4 w-4" /> Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule your visit</DialogTitle>
          <DialogDescription>The tenant and property manager can see this time.</DialogDescription>
        </DialogHeader>
        <Field name="scheduled_at" label="Date and time" required>
          <Input id="scheduled_at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={schedule} loading={pending} disabled={!when}>Confirm time</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteJobDialog({
  workOrderId,
  approvedAmount,
}: {
  workOrderId: string;
  approvedAmount: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const overCap = approvedAmount !== null && Number(amount) > approvedAmount;

  function complete() {
    startTransition(async () => {
      const result = await vendorUpdateJobAction(workOrderId, "completed", {
        actualAmount: Number(amount),
        notes,
      });
      if (result.status === "success") {
        toast.success("Job marked complete.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not complete the job.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1">
          <Check className="h-4 w-4" /> Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete this job</DialogTitle>
          <DialogDescription>
            Record what the work actually cost and describe what you did.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            name="actual_amount"
            label="Final cost (QAR)"
            required
            hint={approvedAmount !== null ? `Approved cap is ${formatCurrency(approvedAmount)}.` : undefined}
            error={overCap ? "This exceeds the approved cap — the manager will need to approve it." : undefined}
          >
            <Input
              id="actual_amount" type="number" step="0.01" min="0"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field name="completion_notes" label="Work performed" required>
            <Textarea
              id="completion_notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Replaced the compressor capacitor, tested cooling, cleaned filters…"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={complete} loading={pending} disabled={!amount || notes.trim().length < 5}>
            Mark complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
