import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, CalendarClock, Home, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getDashboardData } from "@/features/dashboard/queries";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceCategoryChart } from "@/features/dashboard/components/charts";
import { CollectionHero } from "@/features/dashboard/components/collection-hero";
import { AlertGrid, AlertTile } from "@/features/dashboard/components/alert-tile";
import { PlanLimitBanner } from "@/features/dashboard/components/plan-limit-banner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { ctx, membership } = await requireStaff();
  const supabase = await createClient();
  const [data, { data: sub }, { count: userCount }] = await Promise.all([
    getDashboardData(membership.organisationId),
    supabase
      .from("organisation_subscriptions")
      .select("current_period_end, plans ( name, max_units, max_users )")
      .eq("organisation_id", membership.organisationId)
      .maybeSingle(),
    supabase
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisationId)
      .eq("is_active", true),
  ]);

  const plan = (Array.isArray(sub?.plans) ? sub?.plans[0] : sub?.plans) as
    | { name: string; max_units: number | null; max_users: number | null }
    | undefined;

  return (
    <>
      {plan && (
        <PlanLimitBanner
          planName={plan.name}
          units={data.portfolio.units}
          maxUnits={plan.max_units}
          users={userCount ?? 0}
          maxUsers={plan.max_users}
          renewsOn={
            sub?.current_period_end
              ? new Date(sub.current_period_end).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })
              : null
          }
        />
      )}

      <PageHeader
        title={`Good day, ${ctx.fullName.split(" ")[0]}`}
        description={`Portfolio overview for ${membership.organisationName}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/reports"><Button variant="outline" size="sm">Export</Button></Link>
            <Link href="/leases"><Button size="sm">New lease</Button></Link>
          </div>
        }
      />

      {data.alerts.length > 0 && (
        <AlertGrid>
          {data.alerts.map((alert) => (
            <AlertTile
              key={alert.href + alert.label}
              href={alert.href}
              label={alert.label}
              count={alert.count}
              tone={alert.tone}
            />
          ))}
        </AlertGrid>
      )}

      <CollectionHero
        monthLabel={new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}
        collected={data.rent.collected}
        due={data.rent.expected}
        outstanding={data.rent.outstanding}
        behindCount={data.alerts.find((a) => a.href === "/outstanding")?.count ?? 0}
        trend={data.collectionTrend.map((t) => ({
          label: t.month,
          rate: t.expected > 0 ? Math.round((t.collected / t.expected) * 100) : 0,
        }))}
      />

      {/* The secondary figures. Collection leads above; these support it. */}
      <div className="stagger mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${data.portfolio.occupancyPct}%`}
          icon={Home}
          progress={data.portfolio.occupancyPct}
          sublabel={`${data.portfolio.occupied} of ${data.portfolio.units} units let`}
        />
        <StatCard
          label="Active leases"
          value={data.leases.active}
          icon={CalendarClock}
          sublabel={`${data.leases.expiring60} expiring within 60 days`}
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
        <StatCard
          label="Vacant units"
          value={data.portfolio.vacant}
          icon={Building2}
          tone={data.portfolio.vacant > 0 ? "warning" : "success"}
          sublabel={`across ${data.portfolio.properties} properties`}
        />
      </div>

      <div className="mb-5 grid gap-4">
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
