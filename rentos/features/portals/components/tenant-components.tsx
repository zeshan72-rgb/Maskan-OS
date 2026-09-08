"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Plus, Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormBanner } from "@/components/shared/field";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { submitPaymentProofAction } from "@/features/payments/actions";
import { createMaintenanceRequestAction } from "@/features/maintenance/actions";
import { acceptRenewalOfferAction, respondToRenewalOfferAction } from "@/features/leases/actions";
import { MAINTENANCE_PRIORITIES } from "@/lib/validation/maintenance";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export function SubmitPaymentProofDialog({
  leaseId,
  amountDue,
  reference,
}: {
  leaseId: string;
  amountDue: number;
  reference: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitPaymentProofAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Submitted.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Upload className="h-4 w-4" /> I&apos;ve paid — submit proof
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tell us about your transfer</DialogTitle>
          <DialogDescription>
            Your account team will check it against the bank statement and confirm it. Nothing changes on your
            balance until they do.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="lease_id" value={leaseId} />
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <Field name="amount" label="Amount transferred (QAR)" required error={state.fieldErrors?.amount}>
            <Input
              id="amount" name="amount" type="number" step="0.01" min="0.01" required
              defaultValue={amountDue > 0 ? amountDue : undefined}
              inputMode="decimal"
            />
          </Field>

          <Field name="paid_at" label="Date of transfer" required>
            <Input id="paid_at" name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>

          <Field
            name="reference"
            label="Bank reference"
            hint={reference ? `Please quote "${reference}" on the transfer if you haven't already.` : undefined}
          >
            <Input id="reference" name="reference" defaultValue={reference ?? ""} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Submit proof</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CopyableReference({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — please select and copy manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
    >
      <span className="min-w-0">
        <span className="block text-xs text-neutral-500">{label}</span>
        <span className="block truncate text-sm font-medium tabular-nums text-neutral-900">{value}</span>
      </span>
      <Copy className={`h-3.5 w-3.5 shrink-0 transition-colors ${copied ? "text-emerald-600" : "text-neutral-400"}`} />
    </button>
  );
}

export function NewMaintenanceRequestDialog({
  units,
  categories,
}: {
  units: { id: string; label: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMaintenanceRequestAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Request submitted.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Report an issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a maintenance issue</DialogTitle>
          <DialogDescription>Tell us what&apos;s wrong and when it suits you for someone to visit.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          {units.length === 1 ? (
            <input type="hidden" name="unit_id" value={units[0].id} />
          ) : (
            <Field name="unit_id" label="Which home?" required error={state.fieldErrors?.unit_id}>
              <Select id="unit_id" name="unit_id" required>
                <option value="">Select…</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="category_id" label="Type of issue" error={state.fieldErrors?.category_id}>
              <Select id="category_id" name="category_id" defaultValue="">
                <option value="">Not sure</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field name="priority" label="How urgent?" required>
              <Select id="priority" name="priority" defaultValue="normal">
                {MAINTENANCE_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field name="description" label="What's the problem?" required error={state.fieldErrors?.description}>
            <Textarea
              id="description" name="description" required
              placeholder="The AC in the living room is running but blowing warm air…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="preferred_time" label="Best time to visit">
              <Input id="preferred_time" name="preferred_time" placeholder="Weekday mornings" />
            </Field>
            <Field name="access_notes" label="Access notes">
              <Input id="access_notes" name="access_notes" placeholder="Please call before arriving" />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Submit request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenewalOfferCard({
  offer,
}: {
  offer: {
    id: string;
    new_start_date: string;
    new_end_date: string;
    new_monthly_rent: number;
    new_security_deposit: number | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  function respond(decision: "accept" | "declined" | "discussion_requested") {
    startTransition(async () => {
      const result =
        decision === "accept"
          ? await acceptRenewalOfferAction(offer.id, notes)
          : await respondToRenewalOfferAction(offer.id, decision, notes);

      if (result.status === "success") {
        toast.success(result.message ?? "Response sent.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not send your response.");
      }
    });
  }

  return (
    <Card className="animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both] border-sky-200 bg-sky-50/60">
      <CardHeader>
        <CardTitle>Renewal offer</CardTitle>
        <CardDescription>Your landlord would like to renew your tenancy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 sm:grid-cols-3">
          {[
            ["New term", `${formatDate(offer.new_start_date)} → ${formatDate(offer.new_end_date)}`],
            ["New monthly rent", formatCurrency(offer.new_monthly_rent)],
            ["New deposit", offer.new_security_deposit !== null ? formatCurrency(offer.new_security_deposit) : "Unchanged"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-sky-200 bg-white p-3">
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>

        {offer.notes && <p className="rounded-lg bg-white p-3 text-sm text-neutral-600">{offer.notes}</p>}

        <Field name="renewal_notes" label="Add a message (optional)">
          <Textarea
            id="renewal_notes" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Happy to renew, but could we discuss the rent?"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => respond("accept")} loading={pending}>Accept renewal</Button>
          <Button variant="outline" onClick={() => respond("discussion_requested")} disabled={pending}>
            Request a discussion
          </Button>
          <Button variant="ghost" onClick={() => respond("declined")} disabled={pending}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
