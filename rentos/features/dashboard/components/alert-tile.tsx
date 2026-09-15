import Link from "next/link";
import { AlertTriangle, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "danger" | "warning" | "info";

/**
 * Tinted alert tiles, three to a row.
 *
 * The prototype colours these by severity rather than rendering plain white
 * rows, so a glance tells you whether anything is actually wrong. Ours were
 * uniform, which meant a bounced cheque looked exactly like a lease
 * expiring in two months.
 */
const TONE: Record<Tone, { box: string; icon: typeof AlertTriangle }> = {
  danger: { box: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:border-[#F5A9A9]", icon: AlertTriangle },
  warning: { box: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] hover:border-[#F6D268]", icon: Clock },
  info: { box: "border-[#BAE6FD] bg-[#F0F9FF] text-[#075985] hover:border-[#93D5FB]", icon: Bell },
};

export function AlertTile({
  href, label, count, tone,
}: {
  href: string;
  label: string;
  count: number;
  tone: Tone;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] transition-colors",
        t.box
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-[15px] w-[15px] shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <b className="shrink-0 tabular-nums">{count}</b>
    </Link>
  );
}

export function AlertGrid({ children }: { children: React.ReactNode }) {
  return <div className="stagger mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
