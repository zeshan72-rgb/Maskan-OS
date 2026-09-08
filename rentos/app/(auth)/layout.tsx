import { APP_CONFIG } from "@/lib/config/app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">
            R
          </div>
          <span className="text-sm font-semibold text-neutral-900">{APP_CONFIG.name}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
