"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * A controlled dialog built on the native <dialog> semantics rather than
 * Radix, so no new dependency is introduced. The recovered tree only ever
 * imported @radix-ui/react-slot, so adding react-dialog would be a guess.
 *
 * Call sites use <Dialog open onOpenChange> with DialogTrigger asChild.
 */
type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DialogContext = React.createContext<Ctx | null>(null);

function useDialog(component: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`${component} must be used inside <Dialog>`);
  return ctx;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open: openProp, onOpenChange, children }: DialogProps) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = openProp ?? uncontrolled;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (openProp === undefined) setUncontrolled(v);
      onOpenChange?.(v);
    },
    [openProp, onOpenChange]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

interface TriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

function DialogTrigger({ asChild, children }: TriggerProps) {
  const { setOpen } = useDialog("DialogTrigger");
  const open = () => setOpen(true);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: open,
    });
  }
  return (
    <button type="button" onClick={open}>
      {children}
    </button>
  );
}

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useDialog("DialogContent");
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-neutral-900/40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 shadow-lg",
            className
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 pb-3 pr-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 pt-4", className)} {...props} />;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-base font-semibold text-neutral-900", className)} {...props} />
  )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-neutral-500", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogFooter, DialogTitle, DialogDescription,
};
