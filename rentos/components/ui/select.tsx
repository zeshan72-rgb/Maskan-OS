import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * A styled native <select>. The call sites use onChange with e.target.value
 * rather than Radix's onValueChange, so this is deliberately not a Radix
 * component.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white",
          "pl-3 pr-8 text-sm text-neutral-900 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
    </div>
  )
);
Select.displayName = "Select";

export { Select };
