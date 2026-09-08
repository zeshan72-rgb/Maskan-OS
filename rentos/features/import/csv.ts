import { z } from "zod";

/**
 * Minimal RFC-4180-aware CSV parser. Written rather than pulled in as a
 * dependency because the import path must handle quoted fields containing
 * commas and newlines correctly — a naive split() silently corrupts real
 * property data (addresses in particular).
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, ""); // strip BOM from Excel exports

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  function escape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  /** Header names commonly used for this field, for automatic mapping. */
  aliases: string[];
  hint?: string;
}

export interface ImportDefinition {
  key: ImportType;
  label: string;
  description: string;
  fields: ImportField[];
}

export type ImportType = "properties" | "units" | "owners" | "tenants";

export const IMPORT_DEFINITIONS: Record<ImportType, ImportDefinition> = {
  properties: {
    key: "properties",
    label: "Properties",
    description: "Buildings, compounds and commercial assets.",
    fields: [
      { key: "name", label: "Property name", required: true, aliases: ["name", "property", "property name", "building"] },
      { key: "property_code", label: "Property code", required: true, aliases: ["code", "property code", "ref", "reference"] },
      { key: "type", label: "Type", required: false, aliases: ["type", "property type"], hint: "residential, commercial, mixed_use, villa_compound, building, other" },
      { key: "address", label: "Address", required: false, aliases: ["address", "location"] },
      { key: "description", label: "Description", required: false, aliases: ["description", "notes"] },
    ],
  },
  units: {
    key: "units",
    label: "Units",
    description: "Rentable units, matched to properties by property code.",
    fields: [
      { key: "property_code", label: "Property code", required: true, aliases: ["property code", "code", "property"], hint: "Must match an existing property" },
      { key: "unit_number", label: "Unit number", required: true, aliases: ["unit", "unit number", "unit no", "number"] },
      { key: "bedrooms", label: "Bedrooms", required: false, aliases: ["bedrooms", "beds", "br"] },
      { key: "bathrooms", label: "Bathrooms", required: false, aliases: ["bathrooms", "baths"] },
      { key: "area_sqm", label: "Area (m²)", required: false, aliases: ["area", "size", "sqm", "area sqm"] },
      { key: "market_rent", label: "Market rent", required: false, aliases: ["market rent", "rent", "asking rent"] },
      { key: "status", label: "Status", required: false, aliases: ["status"], hint: "vacant, occupied, reserved, maintenance, inactive" },
    ],
  },
  owners: {
    key: "owners",
    label: "Owners",
    description: "Landlords and investment companies.",
    fields: [
      { key: "name", label: "Owner name", required: true, aliases: ["name", "owner", "owner name", "landlord"] },
      { key: "kind", label: "Type", required: false, aliases: ["kind", "type"], hint: "individual or company" },
      { key: "qid_or_cr", label: "QID / CR", required: false, aliases: ["qid", "cr", "qid/cr", "id", "cr number"] },
      { key: "email", label: "Email", required: false, aliases: ["email", "e-mail"] },
      { key: "phone", label: "Phone", required: false, aliases: ["phone", "mobile", "contact"] },
      { key: "address", label: "Address", required: false, aliases: ["address"] },
    ],
  },
  tenants: {
    key: "tenants",
    label: "Tenants",
    description: "People renting units in your portfolio.",
    fields: [
      { key: "name", label: "Tenant name", required: true, aliases: ["name", "tenant", "tenant name"] },
      { key: "qid_or_passport", label: "QID / Passport", required: false, aliases: ["qid", "passport", "id", "qid/passport"] },
      { key: "nationality", label: "Nationality", required: false, aliases: ["nationality", "country"] },
      { key: "email", label: "Email", required: false, aliases: ["email", "e-mail"] },
      { key: "phone", label: "Phone", required: false, aliases: ["phone", "mobile", "contact"] },
      { key: "employer", label: "Employer", required: false, aliases: ["employer", "company", "workplace"] },
    ],
  },
};

/** Suggests a header→field mapping so most imports need no manual mapping. */
export function suggestMapping(definition: ImportDefinition, headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const field of definition.fields) {
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const normalised = header.trim().toLowerCase().replace(/[_-]+/g, " ");
      return field.aliases.includes(normalised);
    });
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

export interface ValidatedRow {
  rowNumber: number;
  values: Record<string, string>;
  errors: string[];
}

export interface ValidationSummary {
  valid: ValidatedRow[];
  invalid: ValidatedRow[];
  total: number;
}

const PROPERTY_TYPES = ["residential", "commercial", "mixed_use", "villa_compound", "building", "other"];
const UNIT_STATUSES = ["vacant", "occupied", "reserved", "maintenance", "inactive"];

/**
 * Validates every row and reports problems per row and per field.
 * Invalid rows are never silently dropped — they're returned so the UI can
 * show exactly what's wrong before anything is written.
 */
export function validateRows(
  type: ImportType,
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>
): ValidationSummary {
  const definition = IMPORT_DEFINITIONS[type];
  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  const valid: ValidatedRow[] = [];
  const invalid: ValidatedRow[] = [];
  const seenKeys = new Set<string>();

  rows.forEach((row, i) => {
    const values: Record<string, string> = {};
    const errors: string[] = [];

    for (const field of definition.fields) {
      const header = mapping[field.key];
      const index = header !== undefined ? headerIndex.get(header) : undefined;
      const raw = index === undefined ? "" : (row[index] ?? "").trim();
      values[field.key] = raw;

      if (field.required && !raw) {
        errors.push(`${field.label} is required`);
        continue;
      }
      if (!raw) continue;

      if (field.key === "email" && !z.string().email().safeParse(raw).success) {
        errors.push(`${field.label} is not a valid email address`);
      }
      if (["bedrooms", "bathrooms", "area_sqm", "market_rent"].includes(field.key) && !Number.isFinite(Number(raw))) {
        errors.push(`${field.label} must be a number`);
      }
      if (field.key === "type" && !PROPERTY_TYPES.includes(raw.toLowerCase())) {
        errors.push(`Type must be one of: ${PROPERTY_TYPES.join(", ")}`);
      }
      if (field.key === "status" && type === "units" && !UNIT_STATUSES.includes(raw.toLowerCase())) {
        errors.push(`Status must be one of: ${UNIT_STATUSES.join(", ")}`);
      }
      if (field.key === "kind" && !["individual", "company"].includes(raw.toLowerCase())) {
        errors.push("Type must be individual or company");
      }
    }

    // Duplicate detection within the file itself.
    const dedupeKey =
      type === "properties" ? values.property_code
      : type === "units" ? `${values.property_code}::${values.unit_number}`
      : null;

    if (dedupeKey) {
      const normalised = dedupeKey.toLowerCase();
      if (seenKeys.has(normalised)) errors.push("Duplicate of an earlier row in this file");
      else seenKeys.add(normalised);
    }

    const entry: ValidatedRow = { rowNumber: i + 2, values, errors }; // +2: 1-indexed plus header row
    if (errors.length > 0) invalid.push(entry);
    else valid.push(entry);
  });

  return { valid, invalid, total: rows.length };
}

/** Downloadable template so people start from the right shape. */
export function buildTemplate(type: ImportType): string {
  const definition = IMPORT_DEFINITIONS[type];
  const headers = definition.fields.map((f) => f.label);

  const examples: Record<ImportType, string[]> = {
    properties: ["The Pearl Residences", "PROP-001", "residential", "Porto Arabia, The Pearl, Doha", "Sea-facing tower"],
    units: ["PROP-001", "101", "2", "2", "120", "9500", "vacant"],
    owners: ["Jassim Al-Thani", "individual", "28511012345", "jassim@example.qa", "+974 5511 2233", "West Bay, Doha"],
    tenants: ["John Smith", "28711098765", "British", "john@example.com", "+974 5533 4455", "Qatar Energy"],
  };

  return toCsv(headers, [examples[type]]);
}
