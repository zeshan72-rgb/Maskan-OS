import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const money = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : Number(v)))
  .refine((v) => Number.isFinite(v), "Enter a valid amount");

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const PAYMENT_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semi-annual" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cheque", label: "Post-dated cheque" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash / manual" },
  { value: "online", label: "Online payment" },
  { value: "other", label: "Other" },
] as const;

export const LEASE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "renewal_offered", label: "Renewal Offered" },
  { value: "renewed", label: "Renewed" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
] as const;

export const CHEQUE_STATUSES = [
  { value: "received", label: "Received" },
  { value: "stored", label: "Stored" },
  { value: "due_soon", label: "Due Soon" },
  { value: "submitted", label: "Submitted" },
  { value: "cleared", label: "Cleared" },
  { value: "bounced", label: "Bounced" },
  { value: "replaced", label: "Replaced" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const leaseSchema = z
  .object({
    property_id: z.string().uuid("Select a property"),
    unit_id: z.string().uuid("Select a unit"),
    tenant_id: z.string().uuid("Select a tenant"),
    owner_id: optionalString,
    start_date: isoDate,
    end_date: isoDate,
    monthly_rent: money.refine((v) => v > 0, "Monthly rent must be greater than zero"),
    security_deposit: optionalMoney.refine((v) => v === undefined || v >= 0, "Deposit cannot be negative"),
    payment_frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "custom"]),
    payment_method: z.enum(["cheque", "bank_transfer", "cash", "online", "other"]),
    grace_period_days: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "") return 0;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : 0;
      }),
    notes: optionalString,
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be after the start date",
    path: ["end_date"],
  });
export type LeaseInput = z.infer<typeof leaseSchema>;

export const renewalOfferSchema = z
  .object({
    lease_id: z.string().uuid(),
    new_start_date: isoDate,
    new_end_date: isoDate,
    new_monthly_rent: money.refine((v) => v > 0, "Rent must be greater than zero"),
    new_security_deposit: optionalMoney,
    notes: optionalString,
  })
  .refine((data) => new Date(data.new_end_date) > new Date(data.new_start_date), {
    message: "End date must be after the start date",
    path: ["new_end_date"],
  });
export type RenewalOfferInput = z.infer<typeof renewalOfferSchema>;

export const paymentSchema = z.object({
  lease_id: z.string().uuid("Select a lease"),
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
  method: z.enum(["cheque", "bank_transfer", "cash", "online", "other"]),
  paid_at: isoDate,
  reference: optionalString,
  payer_name: optionalString,
  note: optionalString,
  /**
   * "auto" allocates oldest-outstanding-first; "manual" expects an
   * allocations JSON payload of [{ instalment_id, amount }].
   */
  allocation_mode: z.enum(["auto", "manual", "none"]).default("auto"),
  allocations: optionalString,
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const allocationEntrySchema = z.object({
  instalment_id: z.string().uuid(),
  amount: z.number().positive(),
});
export const allocationsSchema = z.array(allocationEntrySchema);

export const chequeSchema = z.object({
  lease_id: z.string().uuid("Select a lease"),
  rent_instalment_id: optionalString,
  cheque_number: z.string().trim().min(1, "Cheque number is required"),
  bank_name: z.string().trim().min(2, "Bank name is required"),
  payer_name: z.string().trim().min(2, "Payer name is required"),
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
  cheque_date: isoDate,
  received_date: isoDate,
  internal_notes: optionalString,
});
export type ChequeInput = z.infer<typeof chequeSchema>;

export const chequeStatusSchema = z.object({
  cheque_id: z.string().uuid(),
  status: z.enum(["stored", "due_soon", "submitted", "cleared", "bounced", "replaced", "cancelled"]),
  notes: optionalString,
});
export type ChequeStatusInput = z.infer<typeof chequeStatusSchema>;
