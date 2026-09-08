"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileText, Plus, X } from "lucide-react";
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
  recordExpenseAction, approveExpenseAction,
  generateOwnerStatementAction, finaliseOwnerStatementAction,
} from "@/features/finance/actions";

export function RecordExpenseDialog({
  properties,
  categories,
  vendors,
}: {
  properties: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await recordExpenseAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Expense recorded.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Record expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a property expense</DialogTitle>
          <DialogDescription>
            Expenses only reach owner statements once approved, so nothing is deducted by accident.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="property_id" label="Property" required error={state.fieldErrors?.property_id}>
              <Select id="property_id" name="property_id" required>
                <option value="">Select…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field name="category_id" label="Category" error={state.fieldErrors?.category_id}>
              <Select id="category_id" name="category_id" defaultValue="">
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>

            <Field name="amount" label="Amount (QAR)" required error={state.fieldErrors?.amount}>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
            </Field>

            <Field name="expense_date" label="Date" required error={state.fieldErrors?.expense_date}>
              <Input
                id="expense_date" name="expense_date" type="date" required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>

            <Field name="vendor_id" label="Vendor" className="sm:col-span-2">
              <Select id="vendor_id" name="vendor_id" defaultValue="">
                <option value="">No vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>

            <Field name="description" label="Description" required className="sm:col-span-2" error={state.fieldErrors?.description}>
              <Textarea id="description" name="description" required placeholder="Common area electricity — March" />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Record expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseApprovalActions({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function review(approve: boolean) {
    startTransition(async () => {
      const result = await approveExpenseAction(expenseId, approve);
      if (result.status === "success") {
        toast.success(result.message ?? "Updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update the expense.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="outline" onClick={() => review(true)} loading={pending}>
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" variant="ghost" onClick={() => review(false)} disabled={pending}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function GenerateStatementDialog({ owners }: { owners: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const [ownerId, setOwnerId] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  function generate() {
    startTransition(async () => {
      const result = await generateOwnerStatementAction(ownerId, start, end);
      if (result.status === "success") {
        toast.success(result.message ?? "Statement generated.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not generate the statement.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><FileText className="h-4 w-4" /> Generate statement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate an owner statement</DialogTitle>
          <DialogDescription>
            Figures are computed from rent settled, approved expenses and management fees in the period.
            It saves as a draft so you can review before finalising.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field name="owner_id" label="Owner" required>
            <Select id="owner_id" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Select an owner…</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="period_start" label="Period start" required>
              <Input id="period_start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field name="period_end" label="Period end" required>
              <Input id="period_end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={generate} loading={pending} disabled={!ownerId || !start || !end}>
            Generate draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FinaliseStatementButton({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function finalise() {
    startTransition(async () => {
      const result = await finaliseOwnerStatementAction(statementId);
      if (result.status === "success") {
        toast.success(result.message ?? "Finalised.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not finalise the statement.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={finalise} loading={pending}>
      Finalise
    </Button>
  );
}
