import { ZodError, type ZodSchema } from "zod";
import { PermissionError } from "@/lib/permissions/errors";

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** id of the record created/updated, useful for redirects and optimistic UI */
  id?: string;
}

export const IDLE_STATE: FormState = { status: "idle" };

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).map(([key, messages]) => [key, messages?.[0] ?? "Invalid value"])
  );
}

export function parseForm<T>(schema: ZodSchema<T>, formData: FormData):
  | { ok: true; data: T }
  | { ok: false; state: FormState } {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Please correct the highlighted fields.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Turns database and permission failures into safe, useful messages.
 * Raw Postgres errors are never surfaced to the browser — they can leak
 * schema details — but the common constraint violations are translated
 * into something the user can act on.
 */
export function toSafeError(error: unknown): FormState {
  if (error instanceof PermissionError) {
    return { status: "error", message: error.message };
  }

  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? "";

  if (code === "23505") {
    return { status: "error", message: "A record with these details already exists. Check codes and reference numbers." };
  }
  if (code === "23503") {
    return { status: "error", message: "This record is linked to other data and can't be changed that way." };
  }
  if (code === "42501" || message.includes("row-level security")) {
    return { status: "error", message: "You do not have permission to perform this action." };
  }
  if (message.startsWith("Invalid lease status transition") || message.startsWith("Invalid cheque status transition")) {
    return { status: "error", message: message };
  }
  if (message.startsWith("Rent schedule already generated")) {
    return { status: "error", message: "A rent schedule has already been generated for this lease." };
  }

  console.error("[rentos] unexpected server action error:", error);
  return { status: "error", message: "Something went wrong. Please try again." };
}
