"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, FileText, Wallet, Wrench } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/leases", label: "Leases", icon: FileText },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/maintenance", label: "Jobs", icon: Wrench },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active ? "text-neutral-900" : "text-neutral-400"
            )}
          >
            <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
