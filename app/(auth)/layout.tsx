import Link from "next/link";
import { MaskanLogo } from "@/components/brand/logo";

/**
 * The shell every signed-out screen sits in: sign in, forgot password,
 * reset password and invitation acceptance.
 *
 * The lockup already carries the wordmark, so the separate name underneath
 * it has gone; repeating it read as two logos stacked.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Maskan">
            <MaskanLogo className="h-[38px] w-auto text-neutral-900" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
