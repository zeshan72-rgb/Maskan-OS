import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  /** Trail above the title. The last entry is the current page and is not linked. */
  breadcrumbs?: Crumb[];
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
export function PageHeader({ title, breadcrumbs, description, actions, className }: PageHeaderProps) {
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
        {breadcrumbs?.length ? (
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-neutral-300">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-neutral-900 hover:underline">{crumb.label}</Link>
                ) : (
                  <span className="text-neutral-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {body ? <p className="mt-1 text-sm text-neutral-500">{body}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
