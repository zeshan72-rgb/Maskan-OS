import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";

export const dynamic = "force-dynamic";

/**
 * Where requirePlatformSuperAdmin() and the role guards send someone who is
 * signed in with a valid membership, but lacks the rights for the page they
 * asked for.
 *
 * Outside the (app) group for the same reason as /no-organisation: that
 * layout guards itself and would loop.
 */
export default async function ForbiddenPage() {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
        </span>
        <h1 className="text-lg font-semibold text-neutral-900">Not available to your role</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {membership
            ? `You hold ${membership.roleKeys.join(", ") || "no"} ${
                membership.roleKeys.length === 1 ? "role" : "roles"
              } in ${membership.organisationName}. An administrator can change this in Settings.`
            : "Your account does not have the rights for this page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Back to the dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-neutral-200 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
