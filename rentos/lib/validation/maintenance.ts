import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

export const MAINTENANCE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
] as const;

export const MAINTENANCE_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "assigned", label: "Assigned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const VENDOR_TRADES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC / AC" },
  { value: "general", label: "General maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "pest_control", label: "Pest control" },
  { value: "other", label: "Other" },
] as const;

export const maintenanceRequestSchema = z.object({
  unit_id: z.string().uuid("Select a unit"),
  category_id: optionalString,
  priority: z.enum(["low", "normal", "high", "emergency"]).default("normal"),
  description: z.string().trim().min(10, "Please describe the issue in at least 10 characters"),
  access_notes: optionalString,
  preferred_time: optionalString,
});
export type MaintenanceRequestInput = z.infer<typeof maintenanceRequestSchema>;

export const workOrderSchema = z.object({
  maintenance_request_id: z.string().uuid(),
  vendor_id: optionalString,
  assigned_employee_id: optionalString,
  scheduled_at: optionalString,
  estimated_cost: optionalMoney.refine((v) => v === undefined || v >= 0, "Cost cannot be negative"),
  approved_amount: optionalMoney.refine((v) => v === undefined || v >= 0, "Amount cannot be negative"),
  instructions: optionalString,
});
export type WorkOrderInput = z.infer<typeof workOrderSchema>;

export const vendorSchema = z.object({
  name: z.string().trim().min(2, "Vendor name is required"),
  trade: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Enter a valid email address"),
  phone: optionalString,
  cr_number: optionalString,
  notes: optionalString,
});
export type VendorInput = z.infer<typeof vendorSchema>;

export const workOrderCostSchema = z.object({
  work_order_id: z.string().uuid(),
  actual_amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine((v) => Number.isFinite(v) && v >= 0, "Enter a valid amount"),
  notes: optionalString,
});
export type WorkOrderCostInput = z.infer<typeof workOrderCostSchema>;
