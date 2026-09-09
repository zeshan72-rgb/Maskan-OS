import type { ReactNode } from "react";
import { requireStaff } from "@/lib/permissions/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

/**
 * The operator shell. Every page under (app) returns a bare fragment and
 * relies on this for the sidebar, topbar and page padding.
 *
 * requireStaff() runs here so the guard is applied once for the whole
 * group rather than repeated in each route. Pages still call it for the
 * membership and permission context, which is cached per request.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { ctx, membership } = await requireStaff();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar orgName={membership.organisationName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar fullName={ctx.fullName} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
