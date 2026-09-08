"use client";

import { Search, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils/format";
import { signOutAction } from "@/features/auth/actions";

export function Topbar({ fullName }: { fullName: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 md:px-6">
      <button
        className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-400 hover:border-neutral-300"
        aria-label="Open command menu"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search tenants, units, leases…</span>
        <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Quick create
        </Button>
        <Button size="icon" variant="ghost" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {initials(fullName || "?")}
        </div>
        <form action={signOutAction}>
          <Button size="sm" variant="ghost" type="submit">Sign out</Button>
        </form>
      </div>
    </header>
  );
}
