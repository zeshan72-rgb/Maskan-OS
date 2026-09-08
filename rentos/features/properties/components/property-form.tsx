"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FormBanner } from "@/components/shared/field";
import { PROPERTY_TYPES } from "@/lib/validation/entities";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { createPropertyAction, updatePropertyAction } from "@/features/properties/actions";

export interface PropertyFormValues {
  id?: string;
  name?: string;
  property_code?: string;
  type?: string;
  address?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  management_fee_type?: string | null;
  management_fee_value?: number | null;
  owner_id?: string;
}

export function PropertyForm({
  owners,
  initial,
  mode,
}: {
  owners: { id: string; name: string }[];
  initial?: PropertyFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();

  const action =
    mode === "create" ? createPropertyAction : updatePropertyAction.bind(null, initial?.id ?? "");

  const [state, formAction, pending] = useActionState<FormState, FormData>(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      if (mode === "create" && state.id) router.push(`/properties/${state.id}`);
      else router.refresh();
    }
  }, [state, mode, router]);

  return (
    <form action={formAction} className="space-y-5">
      <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
          <CardDescription>Basic identification and classification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Property name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" defaultValue={initial?.name} placeholder="The Pearl Residences" required />
          </Field>

          <Field
            name="property_code"
            label="Property code"
            required
            hint="Unique within your organisation, e.g. PROP-001"
            error={state.fieldErrors?.property_code}
          >
            <Input id="property_code" name="property_code" defaultValue={initial?.property_code} placeholder="PROP-001" required />
          </Field>

          <Field name="type" label="Property type" required error={state.fieldErrors?.type}>
            <Select id="type" name="type" defaultValue={initial?.type ?? "residential"}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field name="owner_id" label="Owner" hint={mode === "edit" ? "Manage ownership from the Owners tab." : "Optional — you can add owners later."} error={state.fieldErrors?.owner_id}>
            <Select id="owner_id" name="owner_id" defaultValue={initial?.owner_id ?? ""} disabled={mode === "edit"}>
              <option value="">No owner selected</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </Field>

          <Field name="address" label="Address" className="sm:col-span-2" error={state.fieldErrors?.address}>
            <Input id="address" name="address" defaultValue={initial?.address ?? ""} placeholder="Porto Arabia, The Pearl, Doha" />
          </Field>

          <Field name="latitude" label="Latitude" error={state.fieldErrors?.latitude}>
            <Input id="latitude" name="latitude" type="number" step="0.000001" defaultValue={initial?.latitude ?? ""} placeholder="25.3695" />
          </Field>

          <Field name="longitude" label="Longitude" error={state.fieldErrors?.longitude}>
            <Input id="longitude" name="longitude" type="number" step="0.000001" defaultValue={initial?.longitude ?? ""} placeholder="51.5390" />
          </Field>

          <Field name="description" label="Description" className="sm:col-span-2" error={state.fieldErrors?.description}>
            <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} placeholder="Notes about the building, amenities, access…" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Management fee</CardTitle>
          <CardDescription>
            Used when calculating owner statements. Can be overridden per owner later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="management_fee_type" label="Fee type" error={state.fieldErrors?.management_fee_type}>
            <Select id="management_fee_type" name="management_fee_type" defaultValue={initial?.management_fee_type ?? "percentage"}>
              <option value="percentage">Percentage of rent</option>
              <option value="flat">Flat monthly amount</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>

          <Field name="management_fee_value" label="Fee value" hint="Percentage (e.g. 8) or QAR amount." error={state.fieldErrors?.management_fee_value}>
            <Input id="management_fee_value" name="management_fee_value" type="number" step="0.01" min="0" defaultValue={initial?.management_fee_value ?? 0} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending}>
          {mode === "create" ? "Create property" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
