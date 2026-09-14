import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { signOutAction } from "@/features/auth/actions";

/**
 * Shell for the platform console.
 *
 * Deliberately outside the (app) group. That layout calls requireStaff(),
 * which redirects anyone without an organisation membership to
 * /no-organisation — and a platform super admin has no membership by
 * design, because they sit above every organisation rather than inside one.
 * Putting /admin under that layout sent superadmin@ to "No organisation
 * yet" before the page's own guard ever ran.
 *
 * requirePlatformSuperAdmin() checks the flag only, no membership needed.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePlatformSuperAdmin();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-lime text-xs font-bold text-neutral-900">
              R
            </span>
            <span className="text-sm font-semibold text-white">Platform console</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-300 sm:inline">{ctx.fullName}</span>
            <form action={signOutAction}>
              <button className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
