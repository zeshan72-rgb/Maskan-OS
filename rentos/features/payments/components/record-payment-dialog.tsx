"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormBanner } from "@/components/shared/field";
import { PAYMENT_METHODS } from "@/lib/validation/leases";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { recordPaymentAction } from "@/features/payments/actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface OutstandingInstalment {
  id: string;
  instalment_number: number;
  due_date: string;
  original_amount: number;
  outstanding_amount: number;
}

export function RecordPaymentDialog({
  leaseId,
  instalments,
  trigger,
}: {
  leaseId: string;
  instalments: OutstandingInstalment[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manual, setManual] = useState<Record<string, string>>({});

  const totalOutstanding = instalments.reduce((s, i) => s + i.outstanding_amount, 0);

  /** Mirrors the server's oldest-first allocation so the user sees the split before saving. */
  const autoPreview = useMemo(() => {
    let remaining = Number(amount);
    if (!Number.isFinite(remaining) || remaining <= 0) return [];
    const result: { id: string; label: string; applied: number; settles: boolean }[] = [];

    for (const inst of instalments) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, inst.outstanding_amount);
      result.push({
        id: inst.id,
        label: `#${inst.instalment_number} · ${formatDate(inst.due_date)}`,
        applied,
        settles: applied >= inst.outstanding_amount,
      });
      remaining -= applied;
    }
    return result;
  }, [amount, instalments]);

  const manualTotal = Object.values(manual).reduce((s, v) => s + (Number(v) || 0), 0);
  const unallocated = Number(amount || 0) - (mode === "auto"
    ? autoPreview.reduce((s, a) => s + a.applied, 0)
    : manualTotal);

  function handleSubmit(formData: FormData) {
    if (mode === "manual") {
      const entries = Object.entries(manual)
        .filter(([, value]) => Number(value) > 0)
        .map(([instalment_id, value]) => ({ instalment_id, amount: Number(value) }));
      formData.set("allocations", JSON.stringify(entries));
    }
    formData.set("allocation_mode", mode);

    startTransition(async () => {
      const result = await recordPaymentAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Payment recorded.");
        setOpen(false);
        setAmount("");
        setManual({});
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Receipt className="h-4 w-4" /> Record payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Payments are stored separately from rent obligations and linked by allocations, so partial
            payments reduce the balance without marking an instalment paid.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="lease_id" value={leaseId} />
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="amount" label="Amount (QAR)" required error={state.fieldErrors?.amount}>
              <Input
                id="amount" name="amount" type="number" step="0.01" min="0.01" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field name="method" label="Method" required error={state.fieldErrors?.method}>
              <Select id="method" name="method" defaultValue="bank_transfer">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field name="paid_at" label="Date received" required error={state.fieldErrors?.paid_at}>
              <Input id="paid_at" name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </Field>
            <Field name="reference" label="Reference" hint="Transfer reference, receipt no., etc.">
              <Input id="reference" name="reference" />
            </Field>
            <Field name="payer_name" label="Payer name" className="sm:col-span-2">
              <Input id="payer_name" name="payer_name" placeholder="Who the money came from" />
            </Field>
          </div>

          <div className="rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
              <p className="text-xs font-medium text-neutral-700">
                Allocation · {formatCurrency(totalOutstanding)} outstanding
              </p>
              <div className="flex gap-1">
                {(["auto", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                      mode === m ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200"
                    )}
                  >
                    {m === "auto" ? "Oldest first" : "Choose"}
                  </button>
                ))}
              </div>
            </div>

            {instalments.length === 0 ? (
              <p className="px-3 py-4 text-sm text-neutral-500">
                No outstanding instalments on this lease. The payment will be recorded but not allocated.
              </p>
            ) : mode === "auto" ? (
              <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto">
                {autoPreview.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-neutral-500">Enter an amount to preview the allocation.</li>
                ) : (
                  autoPreview.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-neutral-600">{a.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-neutral-900">{formatCurrency(a.applied)}</span>
                        <span className={cn("text-xs", a.settles ? "text-emerald-600" : "text-amber-600")}>
                          {a.settles ? "settles" : "partial"}
                        </span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto">
                {instalments.map((inst) => (
                  <li key={inst.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-neutral-600">
                      #{inst.instalment_number} · {formatDate(inst.due_date)}
                      <span className="ml-1 text-xs text-neutral-400">
                        owes {formatCurrency(inst.outstanding_amount)}
                      </span>
                    </span>
                    <Input
                      type="number" step="0.01" min="0" max={inst.outstanding_amount}
                      className="h-8 w-28"
                      aria-label={`Allocate to instalment ${inst.instalment_number}`}
                      value={manual[inst.id] ?? ""}
                      onChange={(e) => setManual((prev) => ({ ...prev, [inst.id]: e.target.value }))}
                    />
                  </li>
                ))}
              </ul>
            )}

            {Number(amount) > 0 && unallocated > 0.001 && (
              <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {formatCurrency(unallocated)} of this payment won&apos;t be allocated to any instalment.
              </p>
            )}
          </div>

          <Field name="note" label="Internal note">
            <Textarea id="note" name="note" placeholder="Context for the finance team…" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
