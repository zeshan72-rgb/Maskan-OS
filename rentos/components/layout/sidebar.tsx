"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Building2, CheckCircle2, ChevronRight, ChevronsUpDown,
  FileText, LayoutDashboard, Settings, Wallet, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string };
type Section =
  | { kind: "loose"; items: (Item & { icon: typeof LayoutDashboard })[] }
  | { kind: "group"; label: string; icon: typeof LayoutDashboard; items: Item[] };

/**
 * The navigation, grouped rather than flat.
 *
 * Twenty-three links in one list is a wall. The prototype nests them under
 * five parents and opens only the one you are working in, which is what
 * makes the sidebar scannable at this size. Every route is still here; only
 * the arrangement changed.
 */
const NAV: Section[] = [
  { kind: "loose", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    kind: "group", label: "Portfolio", icon: Building2,
    items: [
      { href: "/properties", label: "Properties" },
      { href: "/buildings", label: "Buildings" },
      { href: "/units", label: "Units" },
      { href: "/owners", label: "Owners" },
    ],
  },
  {
    kind: "group", label: "Letting", icon: FileText,
    items: [
      { href: "/vacancy", label: "Vacant units" },
      { href: "/leasing", label: "Pipeline" },
      { href: "/offers", label: "Offers" },
      { href: "/leases", label: "Leases" },
      { href: "/tenants", label: "Tenants" },
    ],
  },
  {
    kind: "group", label: "Money", icon: Wallet,
    items: [
      { href: "/finance", label: "Overview" },
      { href: "/take-payment", label: "Take a payment" },
      { href: "/record-payment", label: "Allocate" },
      { href: "/payments", label: "Payments" },
      { href: "/payments/cheques", label: "Cheques" },
      { href: "/ledger", label: "Ledger" },
      { href: "/outstanding", label: "Outstanding" },
      { href: "/statements", label: "Owner statements" },
      { href: "/expenses", label: "Expenses" },
    ],
  },
  { kind: "group", label: "Operations", icon: Wrench,
    items: [{ href: "/maintenance", label: "Maintenance" }] },
  {
    kind: "group", label: "Compliance", icon: CheckCircle2,
    items: [
      { href: "/reconciliation", label: "Reconciliation" },
      { href: "/opening-balances", label: "Opening balances" },
    ],
  },
  {
    kind: "loose",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const LINK = "flex items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13.5px] font-[450] transition-colors";
const ACTIVE = "bg-lime-pale font-semibold text-neutral-900";
const IDLE = "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900";

function isOn(pathname: string, href: string) {
  // /payments must not light up on /payments/cheques, which has its own
  // entry, so an exact match wins over the prefix rule.
  if (pathname === href) return true;
  if (href === "/payments") return false;
  return pathname.startsWith(href + "/");
}

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  // A group starts open if you are inside it; the user can override that.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      {/* The brand lock-up: ink tile, Archivo wordmark, lime OS badge. */}
      <div className="flex h-14 items-center gap-2.5 border-b border-neutral-200 px-4">
        <div className="grid h-7 w-7 place-items-center rounded-[9px] bg-neutral-900 text-[12px] font-extrabold text-lime">
          OS
        </div>
        <div className="flex items-center gap-[5px]">
          <span className="font-display text-[16px] font-extrabold leading-none tracking-[-0.045em] text-neutral-900 [font-stretch:108%]">
            Maskan
          </span>
          <span className="rounded-[5px] bg-lime px-[5px] py-[3px] font-display text-[11px] font-extrabold leading-none text-neutral-900 [font-stretch:108%]">
            OS
          </span>
        </div>
      </div>

      <button className="mx-3 mt-3 flex items-center justify-between rounded-[9px] border border-neutral-200 px-2.5 py-2 text-left text-xs transition-colors hover:bg-neutral-50">
        <span className="truncate font-medium text-neutral-800">{orgName}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      </button>

      <nav className="flex-1 space-y-[2px] overflow-y-auto px-3 py-3.5">
        {NAV.map((section, si) => {
          if (section.kind === "loose") {
            return section.items.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn(LINK, isOn(pathname, item.href) ? ACTIVE : IDLE)}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ));
          }

          const inside = section.items.some((i) => isOn(pathname, i.href));
          const isOpen = open[section.label] ?? inside;
          return (
            <div key={section.label} className={si > 0 ? "pt-0.5" : undefined}>
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [section.label]: !isOpen }))}
                aria-expanded={isOpen}
                className={cn(LINK, "w-full", inside ? "text-neutral-900" : IDLE)}
              >
                <section.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronRight className={cn(
                  "h-3 w-3 shrink-0 text-neutral-400 transition-transform duration-200",
                  isOpen && "rotate-90")} />
              </button>

              {isOpen && (
                <div className="ml-[7px] mt-[2px] space-y-[2px] border-l border-neutral-200 pl-3">
                  {section.items.map((item) => (
                    <Link key={item.href} href={item.href}
                      className={cn(LINK, "py-[6px]", isOn(pathname, item.href) ? ACTIVE : IDLE)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
