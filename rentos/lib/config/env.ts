// Holds server-side secrets. Must not reach the browser.
import "server-only";

/**
 * Environment validation.
 *
 * A deployment without Supabase credentials is a legitimate intermediate
 * state — someone deploys first and wires up the database second. Rather than
 * crashing with an opaque error, the app detects it and routes to /setup with
 * instructions. These helpers are the single source of truth for that check.
 */

export interface EnvStatus {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  serviceRoleKey: boolean;
  appUrl: boolean;
}

function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0 && !value.startsWith("your-");
}

/**
 * Client-safe: only reads NEXT_PUBLIC_ variables, which are inlined at build
 * time. Referencing process.env.NEXT_PUBLIC_* by full literal name is required
 * for Next.js to substitute them.
 */
export function isSupabaseConfigured(): boolean {
  return (
    present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Server-only: includes the secret key, so never call this from a client component. */
export function getEnvStatus(): EnvStatus {
  return {
    supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    appUrl: present(process.env.NEXT_PUBLIC_APP_URL),
  };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!present(url) || !present(anonKey)) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy — these are read at build time."
    );
  }

  return { url: url as string, anonKey: anonKey as string };
}

export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!present(key)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It's required for platform " +
        "administration, webhooks and invitation acceptance."
    );
  }
  return key as string;
}
