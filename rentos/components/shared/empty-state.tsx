import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200">
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
