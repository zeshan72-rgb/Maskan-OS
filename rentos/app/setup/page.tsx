import { CheckCircle2, Circle, Database, KeyRound, Rocket } from "lucide-react";
import { getEnvStatus } from "@/lib/config/env";
import { APP_CONFIG } from "@/lib/config/app";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const VARIABLES = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    field: "supabaseUrl" as const,
    where: "Supabase → Project Settings → API → Project URL",
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    field: "supabaseAnonKey" as const,
    where: "Supabase → Project Settings → API → anon public",
    secret: false,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    field: "serviceRoleKey" as const,
    where: "Supabase → Project Settings → API → service_role secret",
    secret: true,
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    field: "appUrl" as const,
    where: "Your deployment URL, e.g. https://your-project.vercel.app",
    secret: false,
  },
];

/**
 * Shown by the proxy whenever Supabase credentials are missing. Deploying
 * before wiring up the database is a normal intermediate state, so this
 * explains what's missing rather than throwing an unhelpful runtime error.
 */
export default function SetupPage() {
  const status = getEnvStatus();
  const missing = VARIABLES.filter((v) => !status[v.field]);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">
            R
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{APP_CONFIG.name}</p>
            <p className="text-xs text-neutral-500">Finish setup</p>
          </div>
        </div>

        <div className="animate-[slide-up_0.32s_cubic-bezier(0.22,1,0.36,1)_both] rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-neutral-900">
                The app is deployed, but it has no database yet
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                {APP_CONFIG.name} stores everything in Supabase. Add the {missing.length} missing
                environment variable{missing.length === 1 ? "" : "s"} below, then redeploy — they&apos;re
                read at build time, so refreshing won&apos;t pick them up.
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-2">
            {VARIABLES.map((variable) => {
              const ok = status[variable.field];
              return (
                <li
                  key={variable.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                    ok ? "border-emerald-200 bg-emerald-50/50" : "border-neutral-200"
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
                  )}
                  <div className="min-w-0">
                    <code className="text-xs font-medium text-neutral-900">{variable.key}</code>
                    <p className="mt-0.5 text-xs text-neutral-500">{variable.where}</p>
                    {variable.secret && (
                      <p className="mt-0.5 text-xs text-amber-700">
                        Server-only — never prefix this one with NEXT_PUBLIC_.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <KeyRound className="h-4 w-4 text-neutral-400" /> What to do
          </h2>
          <ol className="mt-3 space-y-3 text-sm text-neutral-600">
            <li>
              <span className="font-medium text-neutral-900">1. Create a Supabase project</span> at
              supabase.com, then copy the three keys from Project Settings → API.
            </li>
            <li>
              <span className="font-medium text-neutral-900">2. Create the schema</span> — paste{" "}
              <code className="rounded bg-neutral-100 px-1 text-xs">supabase/dist/full_schema.sql</code>{" "}
              into the Supabase SQL Editor and run it once. That&apos;s all 17 migrations, including
              row-level security.
            </li>
            <li>
              <span className="font-medium text-neutral-900">3. Add the variables</span> in Vercel under
              Settings → Environment Variables, ticking Production, Preview and Development.
            </li>
            <li>
              <span className="font-medium text-neutral-900">4. Redeploy</span> from Deployments → ⋯ →
              Redeploy. This page will disappear once the app can reach the database.
            </li>
          </ol>

          <p className="mt-4 flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
            <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>
              Optional: run <code className="rounded bg-white px-1">supabase/seed/demo_seed.sql</code>{" "}
              afterwards to populate a demo portfolio with 5 properties, 54 units and sample logins —
              useful for a walkthrough, never for real data.
            </span>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Full instructions are in DEPLOY.md in the project root.
        </p>
      </div>
    </div>
  );
}
