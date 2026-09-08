"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, CreditCard, FileUp, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormBanner } from "@/components/shared/field";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { createOrganisationAction, setOnboardingStepAction } from "@/features/organisations/actions";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "portfolio", label: "Portfolio", icon: Building2 },
  { key: "team", label: "Team", icon: Users },
  { key: "payment", label: "Payments", icon: CreditCard },
  { key: "import", label: "Import", icon: FileUp },
  { key: "complete", label: "Launch", icon: Rocket },
] as const;

/** Shown to a signed-in user who doesn't belong to an organisation yet. */
export function CreateOrganisationStep() {
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganisationAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "error") toast.error(result.message ?? "Could not create the organisation.");
    });
  }

  return (
    <Card className="animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
      <CardHeader>
        <CardTitle>Tell us about your company</CardTitle>
        <CardDescription>
          This becomes your organisation. Everything you create afterwards belongs to it and is invisible to
          every other company on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Company name" required error={state.fieldErrors?.name}>
              <Input id="name" name="name" required placeholder="Pearl Property Management" />
            </Field>
            <Field name="legal_name" label="Commercial / legal name" error={state.fieldErrors?.legal_name}>
              <Input id="legal_name" name="legal_name" placeholder="Pearl Property Management W.L.L." />
            </Field>
            <Field name="email" label="Company email" error={state.fieldErrors?.email}>
              <Input id="email" name="email" type="email" placeholder="info@company.qa" />
            </Field>
            <Field name="phone" label="Phone" error={state.fieldErrors?.phone}>
              <Input id="phone" name="phone" type="tel" placeholder="+974 4444 5566" />
            </Field>
            <Field name="address" label="Address" className="sm:col-span-2" error={state.fieldErrors?.address}>
              <Input id="address" name="address" placeholder="Office 12, West Bay, Doha" />
            </Field>
          </div>

          <Button type="submit" loading={pending}>
            Create organisation <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function OnboardingFlow({
  currentStep,
  stats,
}: {
  currentStep: string;
  stats: { properties: number; units: number; members: number; bankAccounts: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === currentStep));

  function goTo(step: string) {
    startTransition(async () => {
      const result = await setOnboardingStepAction(step);
      if (result.status === "success") {
        if (step === "complete") {
          toast.success("Setup complete — welcome aboard.");
          router.push("/dashboard");
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message ?? "Could not save progress.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1">
            <span className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200",
              i === currentIndex ? "bg-neutral-900 text-white"
              : i < currentIndex ? "bg-emerald-50 text-emerald-700"
              : "bg-neutral-100 text-neutral-500"
            )}>
              {i < currentIndex ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-neutral-300">›</span>}
          </li>
        ))}
      </ol>

      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {currentStep === "portfolio" && (
        <StepCard
          title="Add your portfolio"
          description="Start with a property and its units — or import a spreadsheet if you already have a list."
          done={stats.properties > 0 && stats.units > 0}
          doneLabel={`${stats.properties} propert${stats.properties === 1 ? "y" : "ies"} · ${stats.units} units`}
          actions={
            <>
              <Button asChild><Link href="/properties/new">Add a property</Link></Button>
              <Button variant="outline" asChild><Link href="/import">Import a spreadsheet</Link></Button>
            </>
          }
          onNext={() => goTo("team")}
          pending={pending}
        />
      )}

      {currentStep === "team" && (
        <StepCard
          title="Invite your team"
          description="Property managers, accountants and maintenance staff each get access scoped to their role."
          done={stats.members > 1}
          doneLabel={`${stats.members} team member${stats.members === 1 ? "" : "s"}`}
          actions={<Button asChild><Link href="/settings">Invite team members</Link></Button>}
          onNext={() => goTo("payment")}
          onBack={() => goTo("portfolio")}
          pending={pending}
        />
      )}

      {currentStep === "payment" && (
        <StepCard
          title="Set up rent collection"
          description="Add the bank account tenants transfer rent to. It appears in their portal with a payment reference, so your finance team can match transfers."
          done={stats.bankAccounts > 0}
          doneLabel={`${stats.bankAccounts} account${stats.bankAccounts === 1 ? "" : "s"} configured`}
          actions={<Button asChild><Link href="/settings">Add bank account</Link></Button>}
          onNext={() => goTo("import")}
          onBack={() => goTo("team")}
          pending={pending}
        />
      )}

      {currentStep === "import" && (
        <StepCard
          title="Bring across existing data"
          description="Import owners and tenants from a spreadsheet — or skip if you're starting fresh."
          done={false}
          actions={<Button asChild><Link href="/import">Open the import wizard</Link></Button>}
          onNext={() => goTo("complete")}
          onBack={() => goTo("payment")}
          nextLabel="Finish setup"
          pending={pending}
        />
      )}

      {currentStep === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re all set</CardTitle>
            <CardDescription>Your dashboard is ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepCard({
  title, description, done, doneLabel, actions, onNext, onBack, nextLabel = "Continue", pending,
}: {
  title: string;
  description: string;
  done: boolean;
  doneLabel?: string;
  actions: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  pending: boolean;
}) {
  return (
    <Card className="animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {done && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" /> Done
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {done && doneLabel && <p className="text-sm text-emerald-700">{doneLabel}</p>}
        <div className="flex flex-wrap gap-2">{actions}</div>
        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} disabled={pending}>Back</Button>
          ) : (
            <span />
          )}
          <Button onClick={onNext} loading={pending} variant={done ? "default" : "outline"}>
            {done ? nextLabel : "Skip for now"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
