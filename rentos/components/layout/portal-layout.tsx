import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { signOutAction } from "@/features/auth/actions";
import { APP_CONFIG } from "@/lib/config/app";

/**
 * Shell for the tenant, owner and vendor portals.
 *
 * Deliberately separate from the (app) group: that layout calls
 * requireStaff(), which redirects portal roles away. Each portal page runs
 * its own requireRole() guard, so this layout only supplies chrome.
 */
export default async function PortalLayout({
  children,
  nav,
  title,
}: {
  children: ReactNode;
  nav?: { href: string; label: string }[];
  title?: string;
}) {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
              R
            </span>
            <span className="truncate text-sm font-semibold text-neutral-900">
              {membership?.organisationName ?? APP_CONFIG.name}
            </span>
            {title && (
              <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 sm:inline">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-600 sm:inline">{ctx?.fullName}</span>
            <form action={signOutAction}>
              <button className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {nav && nav.length > 0 && (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
