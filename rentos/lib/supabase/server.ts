import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the session via Next.js cookies.
 * Still subject to RLS — this is the ANON key client, not the admin client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore because middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service-role key. NEVER import this into any file
 * that could end up in a client bundle. Only used in:
 *  - webhook route handlers (verifying provider signatures, writing events)
 *  - server-only storage upload helpers
 *  - the demo seed / admin scripts
 * Bypasses RLS entirely, so every call site must perform its own explicit
 * permission check before using it.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must never be called from the browser");
  }
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
