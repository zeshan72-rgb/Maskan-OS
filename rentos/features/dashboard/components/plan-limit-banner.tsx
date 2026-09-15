import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The plan-limit banner.
 *
 * Shown when an organisation is over its plan on units or users. The
 * prototype's wording matters: nothing has been switched off. Locking a
 * property manager out of their own portfolio mid-month over a billing
 * question is not a plan enforcement strategy, it is a way to lose the
 * account. So this states the position, gives a date, and offers a way to
 * fix it.
 *
 * TODO: the figures are read from the subscription and the current counts;
 * a plan with a null limit is unlimited and shows nothing.
 */
export function PlanLimitBanner({
  planName,
  units,
  maxUnits,
  users,
  maxUsers,
  renewsOn,
}: {
  planName: string;
  units: number;
  maxUnits: number | null;
  users: number;
  maxUsers: number | null;
  renewsOn: string | null;
}) {
  const overUnits = maxUnits !== null && units > maxUnits;
  const overUsers = maxUsers !== null && users > maxUsers;
  if (!overUnits && !overUsers) return null;

  const breaches = [
    overUnits ? `Units ${units} against ${maxUnits} allowed` : null,
    overUsers ? `Users ${users} against ${maxUsers} allowed` : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="mb-4 rounded-[16px] border border-[#FDE68A] bg-[#FFFBEB] p-[18px]">
      <div className="flex flex-wrap items-start gap-[13px]">
        <AlertTriangle className="mt-px h-[22px] w-[22px] shrink-0 text-amber-700" />
        <p className="min-w-[220px] flex-1 text-[12.5px] leading-[1.65] text-[#92400E]">
          <b>You are past the {planName} limit.</b> {breaches}. Nothing has been switched off,
          but this needs sorting{renewsOn ? ` before the next renewal on ${renewsOn}` : ""}.
        </p>
        <Link href="/settings">
          <Button variant="outline" size="sm">See options</Button>
        </Link>
      </div>
    </div>
  );
}
