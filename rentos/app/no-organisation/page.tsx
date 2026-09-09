import Link from "next/link";
import { Building2 } from "lucide-react";
import { getSessionContext } from "@/lib/permissions/context";

export const dynamic = "force-dynamic";

/**
 * Where requireStaff() sends a signed-in account with no active membership.
 *
 * This deliberately sits OUTSIDE the (app) route group. That group's layout
 * calls requireStaff(), which redirects here — so putting this page inside it
 * would redirect to itself forever, which is the loop this page exists to end.
 */
export default async function NoOrganisationPage() {
  const ctx = await getSessionContext();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
          <Building2 className="h-5 w-5 text-neutral-500" />
        </span>
        <h1 className="text-lg font-semibold text-neutral-900">No organisation yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {ctx
            ? `${ctx.email ?? "This account"} is signed in, but it has no active membership. An administrator needs to invite it, or reactivate a membership that has been switched off.`
            : "This account has no active membership."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/setup"
            className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Set up an organisation
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-neutral-200 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Sign in as someone else
          </Link>
        </div>
      </div>
    </main>
  );
}
