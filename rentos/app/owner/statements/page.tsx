import { AlertCircle, FileSpreadsheet } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { getOwnerStatements } from "@/features/portals/owner-queries";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OwnerStatementsPage() {
  const { membership, ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const statements = await getOwnerStatements(membership.organisationId, ownerId);
  const paid = statements.filter((s) => s.status !== "draft");
  const total = paid.reduce((sum, s) => sum + Number(s.owner_payout), 0);

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Statements</h1>
      <p className="mb-6 text-sm text-neutral-500">
        One per period, showing what was collected, what it cost, and what came to you.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Statements" value={statements.length} icon={FileSpreadsheet} />
        <StatCard label="Finalised" value={paid.length} tone="success" />
        <StatCard label="Paid to you" value={formatCurrency(total)} tone="info" sublabel="Across all periods" />
      </div>

      {statements.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title="No statements yet"
          description="Once a period is closed and finalised, its statement appears here." />
      ) : (
        <div className="stagger space-y-3">
          {statements.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">
                      {formatDate(s.period_start)} to {formatDate(s.period_end)}
                    </h2>
                    <p className="text-xs text-neutral-500">Version {s.version}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  {[
                    ["Rent received", Number(s.rent_received)],
                    ["Expenses", -Number(s.expenses)],
                    ["Maintenance", -Number(s.maintenance_costs)],
                    ["Management fee", -Number(s.management_fees)],
                  ].map(([label, amount]) => (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className={`tabular-nums ${(amount as number) < 0 ? "text-red-700" : "text-neutral-900"}`}>
                        {(amount as number) < 0 ? "−" : ""}{formatCurrency(Math.abs(amount as number))}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 font-semibold">
                    <dt className="text-neutral-900">Paid to you</dt>
                    <dd className="tabular-nums text-neutral-900">{formatCurrency(s.owner_payout)}</dd>
                  </div>
                </dl>

                {s.status === "draft" && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                    Still in draft. Figures can change until it is finalised.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
