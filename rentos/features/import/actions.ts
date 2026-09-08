"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import type { ImportType, ValidatedRow } from "./csv";
import type { PropertyType, UnitStatus } from "@/types/database";

export interface ImportResult extends FormState {
  imported?: number;
  skipped?: { rowNumber: number; reason: string }[];
}

const PERMISSION_BY_TYPE: Record<ImportType, string> = {
  properties: "properties.manage",
  units: "properties.manage",
  owners: "owners.manage",
  tenants: "tenants.manage",
};

function toNumber(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Writes validated rows. Rows that fail at write time (a duplicate code
 * already in the database, an unknown property reference) are reported back
 * with their row number and reason — never silently discarded.
 */
export async function runImportAction(type: ImportType, rows: ValidatedRow[]): Promise<ImportResult> {
  try {
    const ctx = await getSessionContext();
    const membership = primaryMembership(ctx);
    if (!ctx || !membership) return { status: "error", message: "You must be signed in." };

    const organisationId = membership.organisationId;
    await assertPermission(organisationId, PERMISSION_BY_TYPE[type]);

    const supabase = await createClient();
    const skipped: { rowNumber: number; reason: string }[] = [];
    let imported = 0;

    if (type === "properties") {
      for (const row of rows) {
        const { error } = await supabase.from("properties").insert({
          organisation_id: organisationId,
          name: row.values.name,
          property_code: row.values.property_code,
          type: (row.values.type || "residential").toLowerCase() as PropertyType,
          address: row.values.address || null,
          description: row.values.description || null,
          created_by: ctx.userId,
        });

        if (error) {
          skipped.push({
            rowNumber: row.rowNumber,
            reason: error.code === "23505"
              ? `Property code "${row.values.property_code}" already exists`
              : "Could not be saved",
          });
        } else imported++;
      }
    }

    if (type === "units") {
      // Resolve property codes once, rather than querying per row.
      const codes = Array.from(new Set(rows.map((r) => r.values.property_code)));
      const { data: properties } = await supabase
        .from("properties")
        .select("id, property_code")
        .eq("organisation_id", organisationId)
        .in("property_code", codes);

      const propertyByCode = new Map((properties ?? []).map((p) => [p.property_code, p.id]));

      for (const row of rows) {
        const propertyId = propertyByCode.get(row.values.property_code);
        if (!propertyId) {
          skipped.push({
            rowNumber: row.rowNumber,
            reason: `No property found with code "${row.values.property_code}"`,
          });
          continue;
        }

        const { error } = await supabase.from("units").insert({
          organisation_id: organisationId,
          property_id: propertyId,
          unit_number: row.values.unit_number,
          bedrooms: toNumber(row.values.bedrooms),
          bathrooms: toNumber(row.values.bathrooms),
          area_sqm: toNumber(row.values.area_sqm),
          market_rent: toNumber(row.values.market_rent),
          current_rent: toNumber(row.values.market_rent),
          status: ((row.values.status || "vacant").toLowerCase() as UnitStatus),
        });

        if (error) {
          skipped.push({
            rowNumber: row.rowNumber,
            reason: error.code === "23505"
              ? `Unit ${row.values.unit_number} already exists in that property`
              : "Could not be saved",
          });
        } else imported++;
      }
    }

    if (type === "owners") {
      for (const row of rows) {
        const { error } = await supabase.from("owners").insert({
          organisation_id: organisationId,
          name: row.values.name,
          kind: (row.values.kind || "individual").toLowerCase(),
          qid_or_cr: row.values.qid_or_cr || null,
          email: row.values.email || null,
          phone: row.values.phone || null,
          address: row.values.address || null,
          created_by: ctx.userId,
        });
        if (error) skipped.push({ rowNumber: row.rowNumber, reason: "Could not be saved" });
        else imported++;
      }
    }

    if (type === "tenants") {
      for (const row of rows) {
        const { error } = await supabase.from("tenants").insert({
          organisation_id: organisationId,
          name: row.values.name,
          qid_or_passport: row.values.qid_or_passport || null,
          nationality: row.values.nationality || null,
          email: row.values.email || null,
          phone: row.values.phone || null,
          employer: row.values.employer || null,
          created_by: ctx.userId,
        });
        if (error) skipped.push({ rowNumber: row.rowNumber, reason: "Could not be saved" });
        else imported++;
      }
    }

    await recordAudit({
      organisationId,
      action: `import.${type}`,
      entityTable: type,
      metadata: { imported, skipped: skipped.length, attempted: rows.length },
    });

    revalidatePath(`/${type}`);
    revalidatePath("/dashboard");

    return {
      status: skipped.length > 0 && imported === 0 ? "error" : "success",
      imported,
      skipped,
      message:
        skipped.length === 0
          ? `Imported ${imported} ${type}.`
          : `Imported ${imported} of ${rows.length}. ${skipped.length} row${skipped.length === 1 ? "" : "s"} could not be saved.`,
    };
  } catch (error) {
    return toSafeError(error);
  }
}
