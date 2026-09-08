"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { buildOwnerStatement } from "./queries";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const expenseSchema = z.object({
  property_id: z.string().uuid("Select a property"),
  unit_id: optionalString,
  owner_id: optionalString,
  vendor_id: optionalString,
  category_id: optionalString,
  maintenance_request_id: optionalString,
  description: z.string().trim().min(3, "Describe what this expense is for"),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine((v) => Number.isFinite(v) && v > 0, "Enter a valid amount"),
  expense_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
});

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

export async function recordExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "finance.expenses.manage");

    const parsed = parseForm(expenseSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", input.property_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!property) return { status: "error", message: "That property could not be found in your organisation." };

    // Default the owner from the property when not supplied, so the expense
    // reaches the right owner statement without extra data entry.
    let ownerId = input.owner_id ?? null;
    if (!ownerId) {
      const { data: link } = await supabase
        .from("property_owners")
        .select("owner_id")
        .eq("property_id", input.property_id)
        .limit(1)
        .maybeSingle();
      ownerId = link?.owner_id ?? null;
    }

    const { data, error } = await supabase
      .from("property_expenses")
      .insert({
        organisation_id: organisationId,
        property_id: input.property_id,
        unit_id: input.unit_id ?? null,
        owner_id: ownerId,
        vendor_id: input.vendor_id ?? null,
        category_id: input.category_id ?? null,
        maintenance_request_id: input.maintenance_request_id ?? null,
        description: input.description,
        amount: input.amount,
        expense_date: input.expense_date,
        approval_status: "pending",
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "expense.recorded", entityTable: "property_expenses", entityId: data.id,
      metadata: { amount: input.amount, property_id: input.property_id },
    });

    revalidatePath("/finance/expenses");
    revalidatePath("/finance");
    return { status: "success", message: "Expense recorded and awaiting approval.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Approving an expense is what makes it count: only approved expenses feed
 * owner statements and the finance dashboard.
 */
export async function approveExpenseAction(expenseId: string, approve: boolean): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "finance.expenses.manage");
    const supabase = await createClient();

    const { data: expense } = await supabase
      .from("property_expenses")
      .select("id, amount, owner_id, property_id, description, expense_date, approval_status")
      .eq("id", expenseId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!expense) return { status: "error", message: "Expense not found." };
    if (expense.approval_status !== "pending") {
      return { status: "error", message: "This expense has already been reviewed." };
    }

    const { error } = await supabase
      .from("property_expenses")
      .update({
        approval_status: approve ? "approved" : "rejected",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", expenseId);
    if (error) throw error;

    // An approved expense becomes a debit on the owner's ledger.
    if (approve && expense.owner_id) {
      await supabase.from("owner_transactions").insert({
        organisation_id: organisationId,
        owner_id: expense.owner_id,
        property_id: expense.property_id,
        transaction_type: "expense",
        amount: -Number(expense.amount),
        reference_table: "property_expenses",
        reference_id: expense.id,
        transaction_date: expense.expense_date,
        notes: expense.description,
      });
    }

    await recordAudit({
      organisationId,
      action: approve ? "expense.approved" : "expense.rejected",
      entityTable: "property_expenses",
      entityId: expenseId,
      metadata: { amount: Number(expense.amount) },
    });

    revalidatePath("/finance/expenses");
    revalidatePath("/finance");
    return { status: "success", message: approve ? "Expense approved." : "Expense rejected." };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Generates an owner statement for a period. Saved as a draft first so it can
 * be reviewed; finalising freezes it. A second statement for the same period
 * is stored as a new version rather than overwriting the original, preserving
 * the audit trail.
 */
export async function generateOwnerStatementAction(
  ownerId: string,
  periodStart: string,
  periodEnd: string
): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "finance.statements.manage");

    const preview = await buildOwnerStatement(organisationId, ownerId, periodStart, periodEnd);
    if (!preview) return { status: "error", message: "Owner not found in your organisation." };

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("owner_statements")
      .select("id, version, status")
      .eq("owner_id", ownerId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .order("version", { ascending: false })
      .limit(1);

    const previous = existing?.[0];
    if (previous && previous.status === "draft") {
      return {
        status: "error",
        message: "A draft statement already exists for this period. Finalise or delete it first.",
      };
    }

    const version = previous ? previous.version + 1 : 1;

    const { data: statement, error } = await supabase
      .from("owner_statements")
      .insert({
        organisation_id: organisationId,
        owner_id: ownerId,
        period_start: periodStart,
        period_end: periodEnd,
        opening_balance: preview.openingBalance,
        rent_received: preview.rentReceived,
        other_income: preview.otherIncome,
        expenses: preview.expenses,
        maintenance_costs: preview.maintenanceCosts,
        management_fees: preview.managementFees,
        adjustments: preview.adjustments,
        owner_payout: preview.ownerPayout,
        closing_balance: preview.closingBalance,
        status: "draft",
        version,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (preview.lineItems.length > 0) {
      await supabase.from("owner_statement_items").insert(
        preview.lineItems.map((item) => ({
          owner_statement_id: statement.id,
          description: item.description,
          amount: item.amount,
        }))
      );
    }

    await recordAudit({
      organisationId, action: "owner_statement.generated", entityTable: "owner_statements", entityId: statement.id,
      metadata: { owner_id: ownerId, period_start: periodStart, period_end: periodEnd, version },
    });

    revalidatePath("/finance/owners");
    return {
      status: "success",
      id: statement.id,
      message: `Statement v${version} generated — payout ${preview.ownerPayout.toFixed(2)} QAR.`,
    };
  } catch (error) {
    return toSafeError(error);
  }
}

/** Finalising makes a statement an immutable snapshot. */
export async function finaliseOwnerStatementAction(statementId: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "finance.statements.manage");
    const supabase = await createClient();

    const { data: statement } = await supabase
      .from("owner_statements")
      .select("id, status, owner_id, owner_payout, period_end")
      .eq("id", statementId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!statement) return { status: "error", message: "Statement not found." };
    if (statement.status !== "draft") {
      return { status: "error", message: "Only a draft statement can be finalised." };
    }

    const { error } = await supabase
      .from("owner_statements")
      .update({ status: "finalised", finalised_by: ctx.userId, finalised_at: new Date().toISOString() })
      .eq("id", statementId);
    if (error) throw error;

    await recordAudit({
      organisationId, action: "owner_statement.finalised", entityTable: "owner_statements", entityId: statementId,
      metadata: { owner_payout: Number(statement.owner_payout) },
    });

    revalidatePath("/finance/owners");
    revalidatePath("/owner/statements");
    return { status: "success", message: "Statement finalised. It's now an immutable record." };
  } catch (error) {
    return toSafeError(error);
  }
}
