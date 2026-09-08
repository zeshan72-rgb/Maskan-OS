"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormBanner } from "@/components/shared/field";
import { FURNISHING_OPTIONS, UNIT_STATUSES } from "@/lib/validation/entities";
import { IDLE_STATE, type FormState } from "@/lib/utils/form-state";
import { createUnitAction, updateUnitAction } from "@/features/properties/actions";

export interface UnitFormValues {
  id?: string;
  unit_number?: string;
  internal_code?: string | null;
  floor?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  unit_type?: string | null;
  furnishing?: string | null;
  market_rent?: number | null;
  current_rent?: number | null;
  status?: string;
}

export function UnitFormDialog({
  propertyId,
  initial,
  trigger,
}: {
  propertyId: string;
  initial?: UnitFormValues;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!initial?.id;

  const action = isEdit ? updateUnitAction.bind(null, initial!.id!) : createUnitAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add unit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit unit" : "Add unit"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this unit's details. Occupancy is controlled by its lease."
              : "Add a rentable unit to this property."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="property_id" value={propertyId} />
          <FormBanner status={state.status} message={state.status === "error" ? state.message : undefined} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="unit_number" label="Unit number" required error={state.fieldErrors?.unit_number}>
              <Input id="unit_number" name="unit_number" defaultValue={initial?.unit_number} placeholder="101" required />
            </Field>
            <Field name="floor" label="Floor" error={state.fieldErrors?.floor}>
              <Input id="floor" name="floor" defaultValue={initial?.floor ?? ""} placeholder="1" />
            </Field>
            <Field name="bedrooms" label="Bedrooms" error={state.fieldErrors?.bedrooms}>
              <Input id="bedrooms" name="bedrooms" type="number" min="0" defaultValue={initial?.bedrooms ?? ""} />
            </Field>
            <Field name="bathrooms" label="Bathrooms" error={state.fieldErrors?.bathrooms}>
              <Input id="bathrooms" name="bathrooms" type="number" min="0" defaultValue={initial?.bathrooms ?? ""} />
            </Field>
            <Field name="area_sqm" label="Area (m²)" error={state.fieldErrors?.area_sqm}>
              <Input id="area_sqm" name="area_sqm" type="number" step="0.01" min="0" defaultValue={initial?.area_sqm ?? ""} />
            </Field>
            <Field name="unit_type" label="Unit type" error={state.fieldErrors?.unit_type}>
              <Input id="unit_type" name="unit_type" defaultValue={initial?.unit_type ?? ""} placeholder="2br / office / shop" />
            </Field>
            <Field name="furnishing" label="Furnishing" error={state.fieldErrors?.furnishing}>
              <Select id="furnishing" name="furnishing" defaultValue={initial?.furnishing ?? "unfurnished"}>
                {FURNISHING_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </Select>
            </Field>
            <Field name="status" label="Status" error={state.fieldErrors?.status}>
              <Select id="status" name="status" defaultValue={initial?.status ?? "vacant"}>
                {UNIT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field name="market_rent" label="Market rent (QAR)" error={state.fieldErrors?.market_rent}>
              <Input id="market_rent" name="market_rent" type="number" step="0.01" min="0" defaultValue={initial?.market_rent ?? ""} />
            </Field>
            <Field name="current_rent" label="Current rent (QAR)" error={state.fieldErrors?.current_rent}>
              <Input id="current_rent" name="current_rent" type="number" step="0.01" min="0" defaultValue={initial?.current_rent ?? ""} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save unit" : "Add unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
