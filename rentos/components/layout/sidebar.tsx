"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlarmClock,
  Banknote,
  BarChart3,
  BookOpen,
  Building,
  Building2,
  ChevronsUpDown,
  Coins,
  DoorOpen,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  LayoutDashboard,
  Lock,
  Receipt,
  Scale,
  Settings,
  Target,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_CONFIG } from "@/lib/config/app";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/buildings", label: "Buildings", icon: Building },
  { href: "/units", label: "Units", icon: Layers },
  { href: "/vacancy", label: "Vacant units", icon: DoorOpen },
  { href: "/leasing", label: "Pipeline", icon: Target },
  { href: "/offers", label: "Offers", icon: FileSignature },
  { href: "/owners", label: "Owners", icon: UserRound },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/leases", label: "Leases", icon: FileText },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/take-payment", label: "Take a payment", icon: Banknote },
  { href: "/record-payment", label: "Allocate", icon: Coins },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/outstanding", label: "Outstanding", icon: AlarmClock },
  { href: "/statements", label: "Statements", icon: FileSpreadsheet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reconciliation", label: "Reconciliation", icon: Scale },
  { href: "/opening-balances", label: "Opening balances", icon: Lock },
  { href: "/payments/cheques", label: "Cheques", icon: Landmark },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-neutral-200 px-4">
        <div className="grid h-7 w-7 place-items-center rounded-[9px] bg-neutral-900 text-[13px] font-extrabold text-lime">
          R
        </div>
        <span className="text-sm font-semibold text-neutral-900">{APP_CONFIG.name}</span>
      </div>

      <button className="mx-3 mt-3 flex items-center justify-between rounded-lg border border-neutral-200 px-2.5 py-2 text-left text-xs hover:bg-neutral-50">
        <span className="truncate font-medium text-neutral-800">{orgName}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      </button>

      <nav className="flex-1 space-y-[2px] overflow-y-auto px-3 py-3.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13.5px] font-[450] transition-colors",
                active ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
