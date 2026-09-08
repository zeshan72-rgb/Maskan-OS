"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, CreditCard, UserPlus } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FormBanner } from "@/components/shared/field";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import {
  updateOrganisationAction, inviteMemberAction, addBankAccountAction,
} from "@/features/settings/actions";

export function OrganisationSettingsForm({
  organisation,
}: {
  organisation: {
    name: string; legal_name: string | null; email: string | null;
    phone: string | null; address: string | null; currency: string; timezone: string;
  };
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateOrganisationAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Shown on statements, receipts and the tenant portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Company name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" defaultValue={organisation.name} required />
          </Field>
          <Field name="legal_name" label="Legal name" error={state.fieldErrors?.legal_name}>
            <Input id="legal_name" name="legal_name" defaultValue={organisation.legal_name ?? ""} />
          </Field>
          <Field name="email" label="Email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" defaultValue={organisation.email ?? ""} />
          </Field>
          <Field name="phone" label="Phone" error={state.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={organisation.phone ?? ""} />
          </Field>
          <Field name="address" label="Address" className="sm:col-span-2" error={state.fieldErrors?.address}>
            <Input id="address" name="address" defaultValue={organisation.address ?? ""} />
          </Field>

          <Field name="currency" label="Currency" hint="Changing currency affects new records only.">
            <Input id="currency" value={organisation.currency} disabled readOnly />
          </Field>
          <Field name="timezone" label="Timezone">
            <Input id="timezone" value={organisation.timezone} disabled readOnly />
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" loading={pending}>Save changes</Button>
    </form>
  );
}

export function InviteMemberDialog({ roles }: { roles: { id: string; key: string | null; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        // When no email provider is configured the action returns the link so
        // it can be shared manually rather than pretending an email was sent.
        const match = result.message?.match(/(https?:\/\/\S+)/);
        if (match) setInviteLink(match[1]);
        else {
          toast.success(result.message ?? "Invitation sent.");
          setOpen(false);
        }
        router.refresh();
      }
    });
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invitation link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy manually.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) { setInviteLink(null); setState(IDLE_STATE); }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="h-4 w-4" /> Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They&apos;ll set their own password on acceptance. Invitations expire after 7 days and work once.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No email provider is configured, so nothing was sent. Share this link with them directly.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={copyLink} aria-label="Copy invitation link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); setInviteLink(null); }}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

            <Field name="email" label="Email address" required error={state.fieldErrors?.email}>
              <Input id="email" name="email" type="email" required placeholder="colleague@company.qa" />
            </Field>

            <Field name="role_id" label="Role" required error={state.fieldErrors?.role_id}>
              <Select id="role_id" name="role_id" required defaultValue="">
                <option value="">Select a role…</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </Select>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" loading={pending}>Send invitation</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BankAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addBankAccountAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Saved.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><CreditCard className="h-4 w-4" /> Add account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a receiving account</DialogTitle>
          <DialogDescription>
            Tenants see the default account and a payment reference when paying by transfer.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="bank_name" label="Bank" required error={state.fieldErrors?.bank_name}>
              <Input id="bank_name" name="bank_name" required placeholder="Qatar National Bank" />
            </Field>
            <Field name="account_name" label="Account name" required error={state.fieldErrors?.account_name}>
              <Input id="account_name" name="account_name" required />
            </Field>
            <Field name="account_number" label="Account number" required error={state.fieldErrors?.account_number}>
              <Input id="account_number" name="account_number" required inputMode="numeric" />
            </Field>
            <Field name="iban" label="IBAN" error={state.fieldErrors?.iban}>
              <Input id="iban" name="iban" placeholder="QA__ ____ ____ ____" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="is_default" defaultChecked className="h-3.5 w-3.5 rounded border-neutral-300" />
            Make this the default account shown to tenants
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>Save account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
