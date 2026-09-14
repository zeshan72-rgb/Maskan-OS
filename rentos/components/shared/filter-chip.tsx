import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * A filter chip, as a link so the list stays server-rendered and shareable
 * by URL.
 *
 * Geometry matches the prototype's `.pill`: fully rounded, 11px horizontal
 * padding, 11.5px text at weight 600. Five staff screens had hand-rolled
 * versions of this with slightly different sizes, which is why the filter
 * rows did not line up with the badges beside them.
 */
export function FilterChip({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-[11px] py-[3px] text-[11.5px] font-semibold leading-tight transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      {children}
    </Link>
  );
}

/** The row a set of chips sits in. */
export function FilterRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-1.5">{children}</div>;
}
