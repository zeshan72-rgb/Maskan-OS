import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

export const PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "villa_compound", label: "Villa Compound" },
  { value: "building", label: "Building" },
  { value: "other", label: "Other" },
] as const;

export const UNIT_STATUSES = [
  { value: "vacant", label: "Vacant" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive", label: "Inactive" },
] as const;

export const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi-furnished" },
  { value: "furnished", label: "Furnished" },
] as const;

export const propertySchema = z.object({
  name: z.string().trim().min(2, "Property name must be at least 2 characters"),
  property_code: z
    .string()
    .trim()
    .min(2, "Property code is required")
    .max(32, "Property code is too long")
    .regex(/^[A-Za-z0-9-_]+$/, "Use letters, numbers, hyphens and underscores only"),
  type: z.enum(["residential", "commercial", "mixed_use", "villa_compound", "building", "other"]),
  address: optionalString,
  latitude: optionalNumber.refine((v) => v === undefined || (v >= -90 && v <= 90), "Latitude must be between -90 and 90"),
  longitude: optionalNumber.refine((v) => v === undefined || (v >= -180 && v <= 180), "Longitude must be between -180 and 180"),
  description: optionalString,
  owner_id: optionalString,
  management_fee_type: z.enum(["percentage", "flat", "custom"]).default("percentage"),
  management_fee_value: optionalNumber.refine((v) => v === undefined || v >= 0, "Fee cannot be negative"),
});
export type PropertyInput = z.infer<typeof propertySchema>;

export const unitSchema = z.object({
  property_id: z.string().uuid("Select a property"),
  unit_number: z.string().trim().min(1, "Unit number is required"),
  internal_code: optionalString,
  floor: optionalString,
  bedrooms: optionalNumber.refine((v) => v === undefined || v >= 0, "Cannot be negative"),
  bathrooms: optionalNumber.refine((v) => v === undefined || v >= 0, "Cannot be negative"),
  area_sqm: optionalNumber.refine((v) => v === undefined || v > 0, "Area must be greater than zero"),
  unit_type: optionalString,
  furnishing: z.enum(["unfurnished", "semi_furnished", "furnished"]).default("unfurnished"),
  market_rent: optionalNumber.refine((v) => v === undefined || v >= 0, "Rent cannot be negative"),
  current_rent: optionalNumber.refine((v) => v === undefined || v >= 0, "Rent cannot be negative"),
  status: z.enum(["vacant", "occupied", "reserved", "maintenance", "inactive"]).default("vacant"),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const ownerSchema = z.object({
  kind: z.enum(["individual", "company"]).default("individual"),
  name: z.string().trim().min(2, "Owner name must be at least 2 characters"),
  qid_or_cr: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Enter a valid email address"),
  phone: optionalString,
  address: optionalString,
  notes: optionalString,
});
export type OwnerInput = z.infer<typeof ownerSchema>;

export const ownerBankAccountSchema = z.object({
  owner_id: z.string().uuid(),
  bank_name: z.string().trim().min(2, "Bank name is required"),
  account_holder_name: z.string().trim().min(2, "Account holder name is required"),
  account_number: z.string().trim().min(4, "Account number is required"),
  iban: optionalString,
});
export type OwnerBankAccountInput = z.infer<typeof ownerBankAccountSchema>;

export const tenantSchema = z.object({
  name: z.string().trim().min(2, "Tenant name must be at least 2 characters"),
  qid_or_passport: optionalString,
  nationality: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Enter a valid email address"),
  phone: optionalString,
  employer: optionalString,
  emergency_contact_name: optionalString,
  emergency_contact_phone: optionalString,
  notes: optionalString,
});
export type TenantInput = z.infer<typeof tenantSchema>;
