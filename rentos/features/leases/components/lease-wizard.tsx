"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormBanner } from "@/components/shared/field";
import { PAYMENT_FREQUENCIES, PAYMENT_METHODS } from "@/lib/validation/leases";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { createLeaseAction } from "@/features/leases/actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Option {
  id: string;
  name: string;
}
interface UnitOption {
  id: string;
  unit_number: string;
  property_id: string;
  current_rent: number | null;
  market_rent: number | null;
  bedrooms: number | null;
}

const STEPS = [
  { key: "unit", label: "Property & unit" },
  { key: "tenant", label: "Tenant" },
  { key: "dates", label: "Dates" },
  { key: "terms", label: "Financial terms" },
  { key: "schedule", label: "Schedule" },
  { key: "review", label: "Review" },
] as const;

export function LeaseWizard({
  properties,
  units,
  tenants,
  owners,
  defaultTenantId,
}: {
  properties: Option[];
  units: UnitOption[];
  tenants: { id: string; name: string; phone: string | null }[];
  owners: Option[];
  defaultTenantId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FormState>(IDLE_STATE);
  const [pending, startTransition] = useTransition();

  const [values, setValues] = useState({
    property_id: "",
    unit_id: "",
    tenant_id: defaultTenantId ?? "",
    owner_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    monthly_rent: "",
    security_deposit: "",
    payment_frequency: "monthly",
    payment_method: "bank_transfer",
    grace_period_days: "0",
    notes: "",
  });

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const availableUnits = useMemo(
    () => units.filter((u) => !values.property_id || u.property_id === values.property_id),
    [units, values.property_id]
  );

  const selectedUnit = units.find((u) => u.id === values.unit_id);
  const selectedTenant = tenants.find((t) => t.id === values.tenant_id);
  const selectedProperty = properties.find((p) => p.id === values.property_id);

  /**
   * Client-side preview of the schedule the database will generate on
   * activation. It mirrors generate_rent_schedule's logic so the manager can
   * sanity-check the plan before committing — the authoritative schedule is
   * still produced server-side.
   */
  const schedulePreview = useMemo(() => {
    const rent = Number(values.monthly_rent);
    if (!Number.isFinite(rent) || rent <= 0) return [];

    const stepMonths =
      { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, custom: 1 }[values.payment_frequency] ?? 1;

    const start = new Date(values.start_date);
    const end = new Date(values.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const count = Math.max(1, Math.ceil(totalMonths / stepMonths));

    return Array.from({ length: count }, (_, i) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i * stepMonths);
      return { number: i + 1, dueDate: due.toISOString().slice(0, 10), amount: rent * stepMonths };
    });
  }, [values.monthly_rent, values.payment_frequency, values.start_date, values.end_date]);

  const totalContract = schedulePreview.reduce((s, i) => s + i.amount, 0);

  function canAdvance(): boolean {
    switch (STEPS[step].key) {
      case "unit": return !!values.property_id && !!values.unit_id;
      case "tenant": return !!values.tenant_id;
      case "dates": return !!values.start_date && !!values.end_date && new Date(values.end_date) > new Date(values.start_date);
      case "terms": return Number(values.monthly_rent) > 0;
      default: return true;
    }
  }

  function submit() {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.set(key, value));

      const result = await createLeaseAction(IDLE_STATE, formData);
      setState(result);
      if (result.status === "success" && result.id) {
        toast.success(result.message ?? "Lease created.");
        router.push(`/leases/${result.id}`);
      } else if (result.status === "error") {
        toast.error(result.message ?? "Could not create the lease.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200",
                i === step
                  ? "bg-neutral-900 text-white"
                  : i < step
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-neutral-100 text-neutral-500"
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-neutral-300">›</span>}
          </li>
        ))}
      </ol>

      <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

      <Card key={step} className="animate-[slide-up_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
        <CardHeader>
          <CardTitle>{STEPS[step].label}</CardTitle>
          <CardDescription>{descriptionFor(STEPS[step].key)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {STEPS[step].key === "unit" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="property_id" label="Property" required>
                <Select
                  id="property_id"
                  value={values.property_id}
                  onChange={(e) => { set("property_id", e.target.value); set("unit_id", ""); }}
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>

              <Field
                name="unit_id"
                label="Unit"
                required
                hint={values.property_id && availableUnits.length === 0 ? "No vacant units in this property." : "Only vacant and reserved units are listed."}
              >
                <Select
                  id="unit_id"
                  value={values.unit_id}
                  disabled={!values.property_id}
                  onChange={(e) => {
                    set("unit_id", e.target.value);
                    const unit = units.find((u) => u.id === e.target.value);
                    if (unit && !values.monthly_rent) {
                      set("monthly_rent", String(unit.current_rent ?? unit.market_rent ?? ""));
                    }
                  }}
                >
                  <option value="">Select a unit…</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number}
                      {u.bedrooms !== null ? ` · ${u.bedrooms} bed` : ""}
                      {u.market_rent ? ` · ${formatCurrency(u.market_rent)}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field name="owner_id" label="Owner" hint="Used for owner statements and portal visibility." className="sm:col-span-2">
                <Select id="owner_id" value={values.owner_id} onChange={(e) => set("owner_id", e.target.value)}>
                  <option value="">No owner selected</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {STEPS[step].key === "tenant" && (
            <Field name="tenant_id" label="Tenant" required hint="Create the tenant record first if they aren't listed.">
              <Select id="tenant_id" value={values.tenant_id} onChange={(e) => set("tenant_id", e.target.value)}>
                <option value="">Select a tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ""}</option>
                ))}
              </Select>
            </Field>
          )}

          {STEPS[step].key === "dates" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="start_date" label="Start date" required>
                <Input id="start_date" type="date" value={values.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </Field>
              <Field name="end_date" label="End date" required>
                <Input id="end_date" type="date" value={values.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </Field>
              <Field name="grace_period_days" label="Grace period (days)" hint="Days after the due date before rent is treated as late." className="sm:col-span-2">
                <Input id="grace_period_days" type="number" min="0" value={values.grace_period_days} onChange={(e) => set("grace_period_days", e.target.value)} />
              </Field>
            </div>
          )}

          {STEPS[step].key === "terms" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="monthly_rent" label="Monthly rent (QAR)" required>
                <Input id="monthly_rent" type="number" step="0.01" min="0" value={values.monthly_rent} onChange={(e) => set("monthly_rent", e.target.value)} />
              </Field>
              <Field name="security_deposit" label="Security deposit (QAR)">
                <Input id="security_deposit" type="number" step="0.01" min="0" value={values.security_deposit} onChange={(e) => set("security_deposit", e.target.value)} />
              </Field>
              <Field name="notes" label="Notes" className="sm:col-span-2">
                <Textarea id="notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Special conditions, included utilities, parking…" />
              </Field>
            </div>
          )}

          {STEPS[step].key === "schedule" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="payment_frequency" label="Payment frequency" required>
                  <Select id="payment_frequency" value={values.payment_frequency} onChange={(e) => set("payment_frequency", e.target.value)}>
                    {PAYMENT_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </Field>
                <Field name="payment_method" label="Payment method" required>
                  <Select id="payment_method" value={values.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                </Field>
              </div>

              {schedulePreview.length > 0 && (
                <div className="rounded-lg border border-neutral-200">
                  <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-xs font-medium text-neutral-700">
                      {schedulePreview.length} instalment{schedulePreview.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs tabular-nums text-neutral-500">Total {formatCurrency(totalContract)}</p>
                  </div>
                  <ul className="max-h-56 divide-y divide-neutral-100 overflow-y-auto">
                    {schedulePreview.map((i) => (
                      <li key={i.number} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-neutral-500">#{i.number}</span>
                        <span className="text-neutral-700">{formatDate(i.dueDate)}</span>
                        <span className="tabular-nums text-neutral-900">{formatCurrency(i.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500">
                    Preview only. The definitive schedule is generated by the database when you activate the lease.
                  </p>
                </div>
              )}
            </>
          )}

          {STEPS[step].key === "review" && (
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Property", selectedProperty?.name ?? "—"],
                ["Unit", selectedUnit?.unit_number ?? "—"],
                ["Tenant", selectedTenant?.name ?? "—"],
                ["Term", `${formatDate(values.start_date)} → ${formatDate(values.end_date)}`],
                ["Monthly rent", formatCurrency(Number(values.monthly_rent))],
                ["Total contract", formatCurrency(totalContract)],
                ["Security deposit", formatCurrency(Number(values.security_deposit || 0))],
                ["Frequency", PAYMENT_FREQUENCIES.find((f) => f.value === values.payment_frequency)?.label ?? "—"],
                ["Method", PAYMENT_METHODS.find((m) => m.value === values.payment_method)?.label ?? "—"],
                ["Instalments", String(schedulePreview.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="font-medium tabular-nums text-neutral-900">{value}</dd>
                </div>
              ))}
              <p className="pt-3 text-xs text-neutral-500">
                The lease will be created as a <strong>draft</strong>. Rent instalments are generated when you
                activate it, so nothing is billed until you&apos;re ready.
              </p>
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} loading={pending}>
            <FileText className="h-4 w-4" /> Create lease
          </Button>
        )}
      </div>
    </div>
  );
}

function descriptionFor(key: (typeof STEPS)[number]["key"]): string {
  return {
    unit: "Choose which unit this tenancy covers.",
    tenant: "Who is signing the lease.",
    dates: "Tenancy period and late-payment grace.",
    terms: "Rent and deposit for the term.",
    schedule: "How often rent falls due and how it will be paid.",
    review: "Confirm everything before creating the lease.",
  }[key];
}
