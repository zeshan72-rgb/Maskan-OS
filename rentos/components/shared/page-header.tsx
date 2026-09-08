import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  /** A string, or an array whose null entries are dropped and the rest joined. */
  description?: ReactNode;
  /** Buttons or controls, right aligned on wide screens. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The heading block at the top of every page: title, optional supporting
 * line, optional actions. Kept deliberately plain so pages set their own
 * spacing below it.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const body = Array.isArray(description)
    ? description.filter(Boolean).join(" · ")
    : description;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {body ? <p className="mt-1 text-sm text-neutral-500">{body}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
