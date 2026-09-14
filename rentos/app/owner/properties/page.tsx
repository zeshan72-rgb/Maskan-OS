import { AlertCircle, Building2, Home } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { getOwnerPortalSummary } from "@/features/portals/owner-queries";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OwnerPropertiesPage() {
  const { membership, ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const s = await getOwnerPortalSummary(membership.organisationId, ownerId);
  const pct = s.totals.units > 0 ? Math.round((s.totals.occupied / s.totals.units) * 100) : 0;

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Your properties</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Everything held in your name, and how much of it is earning.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Properties" value={s.totals.properties} icon={Building2} />
        <StatCard label="Units" value={s.totals.units} icon={Home} sublabel={`${s.totals.vacant} vacant`} />
        <StatCard label="Occupancy" value={`${pct}%`} progress={pct} tone={pct >= 90 ? "success" : "default"} />
      </div>

      {s.properties.length === 0 ? (
        <EmptyState icon={Building2} title="Nothing registered yet"
          description="No property is recorded against your name." />
      ) : (
        <div className="stagger space-y-3">
          {s.properties.map((p) => {
            const occ = p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-neutral-900">{p.name}</h2>
                      {p.address && <p className="text-sm text-neutral-500">{p.address}</p>}
                    </div>
                    <Badge variant={occ === 100 ? "success" : occ >= 80 ? "outline" : "warning"}>
                      {occ}% let
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[["Units", p.units], ["Let", p.occupied], ["Empty", p.units - p.occupied]].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg bg-neutral-50 px-3 py-2">
                        <p className="text-xs text-neutral-500">{k}</p>
                        <p className="font-display text-lg font-extrabold tabular-nums text-neutral-900">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-neutral-900" style={{ width: `${occ}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-neutral-500">
        Rent received across the portfolio this period: {formatCurrency(s.totals.rentReceived)}.
      </p>
    </PortalLayout>
  );
}
