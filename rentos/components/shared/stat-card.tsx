import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, { value: string; bar: string; icon: string }> = {
  default: { value: "text-neutral-900", bar: "bg-neutral-900", icon: "bg-neutral-100 text-neutral-600" },
  success: { value: "text-emerald-700", bar: "bg-emerald-600", icon: "bg-emerald-50 text-emerald-600" },
  warning: { value: "text-amber-700", bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
  danger: { value: "text-red-700", bar: "bg-red-600", icon: "bg-red-50 text-red-600" },
  info: { value: "text-sky-700", bar: "bg-sky-600", icon: "bg-sky-50 text-sky-600" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  /** Secondary line under the value. */
  sublabel?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** 0 to 100. Renders a progress bar when provided. */
  progress?: number;
  className?: string;
}

/**
 * A single figure with its label. Used in rows of three or four at the top
 * of detail pages.
 */
export function StatCard({
  label, value, sublabel, icon: Icon, tone = "default", progress, className,
}: StatCardProps) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-neutral-500">{label}</p>
        {Icon ? (
          <span className={cn("rounded-lg p-1.5", t.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", t.value)}>
        {value}
      </p>

      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn("h-full rounded-full transition-[width]", t.bar)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}

      {sublabel ? <p className="mt-2 text-xs text-neutral-500">{sublabel}</p> : null}
    </div>
  );
}
