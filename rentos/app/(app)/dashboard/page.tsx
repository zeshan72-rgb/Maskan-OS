import Link from "next/link";
import { AlertTriangle, Banknote, Building2, CalendarClock, Home, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getDashboardData } from "@/features/dashboard/queries";
import { CollectionTrendChart, MaintenanceCategoryChart } from "@/features/dashboard/components/charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const ALERT_TONE = {
  danger: "danger",
  warning: "warning",
  info: "info",
} as const;

export default async function DashboardPage() {
  const { ctx, membership } = await requireStaff();
  const data = await getDashboardData(membership.organisationId);

  return (
    <>
      <PageHeader
        title={`Good day, ${ctx.fullName.split(" ")[0]}`}
        description={`${membership.organisationName} — portfolio, collection and operations at a glance.`}
      />

      {data.alerts.length > 0 && (
        <div className="stagger mb-6 space-y-2">
          {data.alerts.map((alert) => (
            <Link
              key={alert.href + alert.label}
              href={alert.href}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300"
            >
              <span className="flex items-center gap-2.5 text-sm text-neutral-800">
                <AlertTriangle className="h-4 w-4 text-neutral-400" />
                {alert.label}
              </span>
              <Badge variant={ALERT_TONE[alert.tone]}>{alert.count}</Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${data.portfolio.occupancyPct}%`}
          icon={Home}
          progress={data.portfolio.occupancyPct}
          sublabel={`${data.portfolio.occupied} of ${data.portfolio.units} units let`}
        />
        <StatCard
          label="Collected this month"
          value={formatCurrency(data.rent.collected)}
          icon={Banknote}
          tone="success"
          progress={data.rent.collectionPct}
          sublabel={`${data.rent.collectionPct}% of ${formatCurrency(data.rent.expected)} due`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(data.rent.outstanding)}
          tone={data.rent.overdue > 0 ? "danger" : data.rent.outstanding > 0 ? "warning" : "success"}
          sublabel={
            data.rent.overdue > 0 ? `${formatCurrency(data.rent.overdue)} overdue` : "Nothing overdue"
          }
        />
        <StatCard
          label="Open maintenance"
          value={data.maintenance.newCount + data.maintenance.inProgress}
          icon={Wrench}
          tone={data.maintenance.urgent > 0 ? "danger" : "default"}
          sublabel={
            data.maintenance.urgent > 0
              ? `${data.maintenance.urgent} urgent`
              : `${data.maintenance.inProgress} in progress`
          }
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Collection trend</CardTitle>
            <CardDescription>Rent due against rent collected, last six months.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.collectionTrend.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No rent history yet"
                description="Once leases are activated and instalments fall due, the trend appears here."
              />
            ) : (
              <CollectionTrendChart data={data.collectionTrend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance by category</CardTitle>
            <CardDescription>Open requests, grouped.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.maintenanceByCategory.length === 0 ? (
              <EmptyState icon={Wrench} title="Nothing open" description="No maintenance requests are currently open." />
            ) : (
              <MaintenanceCategoryChart data={data.maintenanceByCategory} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-neutral-400" /> Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Properties", data.portfolio.properties],
                ["Units", data.portfolio.units],
                ["Occupied", data.portfolio.occupied],
                ["Vacant", data.portfolio.vacant],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between py-2">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="font-medium tabular-nums text-neutral-900">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-neutral-400" /> Leases expiring
            </CardTitle>
            <CardDescription>Renewal offers should go out before these dates.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Active leases", data.leases.active],
                ["Within 30 days", data.leases.expiring30],
                ["Within 60 days", data.leases.expiring60],
                ["Within 90 days", data.leases.expiring90],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between py-2">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="font-medium tabular-nums text-neutral-900">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/leases"
              className="mt-3 inline-block text-sm text-neutral-900 underline-offset-2 hover:underline"
            >
              View all leases
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
