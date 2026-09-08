"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, FileText, Home, Landmark, Loader2, Plus, Receipt, Search, UserRound, Users, Wrench,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { globalSearch, type SearchEntity, type SearchGroup } from "@/features/search/actions";
import { cn } from "@/lib/utils/cn";

const ENTITY_ICONS: Record<SearchEntity, typeof Home> = {
  tenant: Users,
  property: Building2,
  unit: Home,
  owner: UserRound,
  lease: FileText,
  cheque: Landmark,
  payment: Receipt,
  maintenance: Wrench,
};

interface QuickAction {
  label: string;
  href: string;
  icon: typeof Home;
  keywords: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Create tenant", href: "/tenants/new", icon: Users, keywords: "tenant new add create" },
  { label: "Create lease", href: "/leases/new", icon: FileText, keywords: "lease new add create tenancy" },
  { label: "Add property", href: "/properties/new", icon: Building2, keywords: "property new add create building" },
  { label: "Add owner", href: "/owners/new", icon: UserRound, keywords: "owner new add create landlord" },
  { label: "Record payment", href: "/finance/payments", icon: Receipt, keywords: "payment record money rent paid" },
  { label: "View cheques", href: "/payments/cheques", icon: Landmark, keywords: "cheque bank post-dated" },
  { label: "Maintenance requests", href: "/maintenance", icon: Wrench, keywords: "maintenance repair job request" },
  { label: "Outstanding rent", href: "/finance/outstanding", icon: Receipt, keywords: "arrears overdue outstanding debt" },
];

/**
 * ⌘K command menu. Search runs server-side through globalSearch so results
 * respect RLS — the browser never queries the database directly, and a user
 * can't search their way into another organisation's records.
 */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const filteredActions = term.trim()
    ? QUICK_ACTIONS.filter((a) =>
        `${a.label} ${a.keywords}`.toLowerCase().includes(term.trim().toLowerCase())
      )
    : QUICK_ACTIONS;

  const flatResults = [
    ...filteredActions.map((a) => ({ kind: "action" as const, href: a.href, label: a.label })),
    ...groups.flatMap((g) => g.results.map((r) => ({ kind: "result" as const, href: r.href, label: r.title }))),
  ];

  // Debounced server search. requestId guards against a slow earlier query
  // overwriting the results of a later one.
  useEffect(() => {
    if (term.trim().length < 2) {
      setGroups([]);
      return;
    }
    const id = ++requestId.current;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearch(term);
        if (id === requestId.current) setGroups(results);
      });
    }, 220);
    return () => clearTimeout(timeout);
  }, [term]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term, groups]);

  useEffect(() => {
    if (open) {
      setTerm("");
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = flatResults[activeIndex];
      if (target) navigate(target.href);
    }
  }

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogTitle className="sr-only">Search RentOS</DialogTitle>

        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tenants, units, leases, cheques…"
            aria-label="Search"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredActions.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">Actions</p>
              {filteredActions.map((action) => {
                runningIndex += 1;
                const index = runningIndex;
                return (
                  <button
                    key={action.href}
                    onClick={() => navigate(action.href)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                      index === activeIndex ? "bg-neutral-100 text-neutral-900" : "text-neutral-700"
                    )}
                  >
                    <action.icon className="h-4 w-4 text-neutral-400" />
                    {action.label}
                    <Plus className="ml-auto h-3 w-3 text-neutral-300" />
                  </button>
                );
              })}
            </div>
          )}

          {groups.map((group) => {
            const Icon = ENTITY_ICONS[group.entity];
            return (
              <div key={group.entity} className="mb-1">
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  {group.label}
                </p>
                {group.results.map((result) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        index === activeIndex ? "bg-neutral-100" : ""
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-neutral-900">{result.title}</span>
                        {result.subtitle && (
                          <span className="block truncate text-xs text-neutral-500">{result.subtitle}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {term.trim().length >= 2 && !isPending && groups.length === 0 && filteredActions.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-neutral-500">
              Nothing found for &ldquo;{term}&rdquo;.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-200 px-4 py-2 text-xs text-neutral-400">
          <span><kbd className="rounded border border-neutral-200 px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-neutral-200 px-1">↵</kbd> open</span>
          <span><kbd className="rounded border border-neutral-200 px-1">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Registers the ⌘K / Ctrl+K shortcut and owns the menu's open state. */
export function useCommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
