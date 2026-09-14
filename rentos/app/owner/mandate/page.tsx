import { CalendarClock, Check, ShieldCheck, X } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { STUB_MANDATE, mandateDaysRemaining } from "@/features/portals/owner-stub-data";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** TODO: stub data. See features/portals/owner-stub-data.ts. */
export default async function OwnerMandatePage() {
  await requireOwner();
  const m = STUB_MANDATE;
  const days = mandateDaysRemaining();
  const granted = m.authorities.filter((a) => a.granted);
  const withheld = m.authorities.filter((a) => !a.granted);

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Our agreement</h1>
          <p className="text-sm text-neutral-500">
            What you have appointed us to do, and what we may do without asking you.
          </p>
        </div>
        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
          Sample data
        </span>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Agreement" value={m.code} icon={ShieldCheck}
          sublabel={m.isExclusive ? "Exclusive" : "Open, other agents may market"} />
        <StatCard label="Type" value={m.type} />
        <StatCard label="Runs to" value={formatDate(m.endsOn)} icon={CalendarClock}
          tone={days < 60 ? "warning" : "default"} sublabel={`${days} days left`} />
        <StatCard label="Notice period" value={`${m.noticeDays} days`}
          sublabel="Either side, in writing" />
      </div>

      {/* The distinction that matters to an owner: what happens without
          them, and what waits for them. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">We may do this without asking</h2>
            <ul className="space-y-3">
              {granted.map((a) => (
                <li key={a.key} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm text-neutral-900">{a.label}</p>
                    <p className="text-xs text-neutral-500">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">We must ask you first</h2>
            {withheld.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing is withheld. Every authority above has been granted.
              </p>
            ) : (
              <ul className="space-y-3">
                {withheld.map((a) => (
                  <li key={a.key} className="flex gap-2.5">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-900">{a.label}</p>
                      <p className="text-xs text-neutral-500">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">What we charge</h2>
          <dl className="divide-y divide-neutral-100 text-sm">
            {[
              ["Management fee", `${m.managementFeePct}% of rent collected`],
              ["Letting fee", `${m.lettingFeeMonths} month's rent per new tenancy`],
              ["Renewal fee", `${m.renewalFeeMonths} month's rent per renewal`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right text-neutral-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-neutral-500">
            The management fee is charged on rent actually collected, not rent due. A month
            that is not paid is not charged for.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="text-neutral-500">Covers:</span>
        {m.properties.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Sample data. There is no mandates table yet; see
        features/portals/owner-stub-data.ts for the migration this needs.
      </p>
    </PortalLayout>
  );
}
