import { createClient } from "@/lib/supabase/server";
import { hasPermission, getSessionContext } from "@/lib/permissions/context";

export interface OrganisationSettings {
  organisation: {
    id: string;
    name: string;
    legal_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
    timezone: string;
    status: string;
  };
  members: { id: string; full_name: string; email: string; is_active: boolean; roles: string[] }[];
  invitations: { id: string; email: string; role_name: string; expires_at: string; status: string }[];
  bankAccounts: {
    id: string; bank_name: string; account_name: string; account_number: string;
    iban: string | null; is_default: boolean;
  }[];
  featureFlags: { key: string; is_enabled: boolean }[];
}

const DEFAULT_FLAGS = [
  "online_payments", "whatsapp", "ai_document_extraction", "white_label", "advanced_reporting",
];

/** Masks all but the last four characters of an account identifier. */
function maskAccount(value: string): string {
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export async function getOrganisationSettings(organisationId: string): Promise<OrganisationSettings> {
  const supabase = await createClient();
  const ctx = await getSessionContext();

  // Full bank numbers are only ever assembled for roles holding the explicit
  // finance permission; everyone else receives a masked value from the server,
  // so the real number never reaches their browser at all.
  const canSeeBankDetails = hasPermission(ctx, organisationId, "finance.bank_details.view");

  const [{ data: organisation }, { data: members }, { data: invitations }, { data: bankAccounts }, { data: flags }] =
    await Promise.all([
      supabase
        .from("organisations")
        .select("id, name, legal_name, email, phone, address, currency, timezone, status")
        .eq("id", organisationId)
        .single(),
      supabase
        .from("organisation_members")
        .select("id, is_active, profile_id, profiles ( full_name, email ), member_roles ( roles ( name ) )")
        .eq("organisation_id", organisationId),
      supabase
        .from("invitations")
        .select("id, email, expires_at, status, roles ( name )")
        .eq("organisation_id", organisationId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("bank_accounts")
        .select("id, bank_name, account_name, account_number, iban, is_default")
        .eq("organisation_id", organisationId)
        .order("is_default", { ascending: false }),
      supabase
        .from("feature_flags")
        .select("key, is_enabled")
        .or(`organisation_id.is.null,organisation_id.eq.${organisationId}`),
    ]);

  const flagMap = new Map((flags ?? []).map((f) => [f.key, f.is_enabled]));

  return {
    organisation: organisation ?? {
      id: organisationId, name: "", legal_name: null, email: null, phone: null,
      address: null, currency: "QAR", timezone: "Asia/Qatar", status: "active",
    },
    members: (members ?? []).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const roleRows = (m.member_roles ?? []) as unknown as { roles: { name: string } | null }[];
      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        is_active: m.is_active,
        roles: roleRows.map((r) => r.roles?.name).filter((n): n is string => !!n),
      };
    }),
    invitations: (invitations ?? []).map((i) => {
      const role = Array.isArray(i.roles) ? i.roles[0] : i.roles;
      return {
        id: i.id,
        email: i.email,
        role_name: role?.name ?? "—",
        expires_at: i.expires_at,
        status: i.status,
      };
    }),
    bankAccounts: (bankAccounts ?? []).map((a) => ({
      id: a.id,
      bank_name: a.bank_name,
      account_name: a.account_name,
      account_number: canSeeBankDetails ? a.account_number : maskAccount(a.account_number),
      iban: a.iban ? (canSeeBankDetails ? a.iban : maskAccount(a.iban)) : null,
      is_default: a.is_default,
    })),
    featureFlags: DEFAULT_FLAGS.map((key) => ({ key, is_enabled: flagMap.get(key) ?? false })),
  };
}
