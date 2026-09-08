import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";

export function Field({
  name,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="animate-[slide-down_0.2s_ease-out] text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormBanner({ status, message }: { status: "idle" | "success" | "error"; message?: string }) {
  if (status === "idle" || !message) return null;
  return (
    <div
      role="status"
      className={cn(
        "animate-[slide-down_0.2s_ease-out] rounded-lg px-3 py-2 text-sm",
        status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}
    >
      {message}
    </div>
  );
}
