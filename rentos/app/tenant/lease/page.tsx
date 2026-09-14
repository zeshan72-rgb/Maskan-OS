import { AlertCircle, CalendarClock, Home, Users, Wallet } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import { createClient } from "@/lib/supabase/server";
import { getTenantRenewalOffer } from "@/features/portals/tenant-queries";
import { RenewalOfferCard } from "@/features/portals/components/tenant-components";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

// The Supabase row types are degraded by the project-wide inference issue,
// so the shapes these queries select are named here.
type LeaseRow = {
  id: string; lease_code: string; start_date: string; end_date: string;
  monthly_rent: number; total_contract_rent: number; security_deposit: number;
  payment_frequency: string; payment_method: string; status: string;
  grace_period_days: number | null; notes: string | null;
  units: { unit_number: string; bedrooms: number | null; bathrooms: number | null;
           area_sqm: number | null; furnishing: string | null } | null;
  properties: { name: string; address: string | null } | null;
};
type OccupantRow = { id: string; name: string; relationship: string | null };


function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function TenantLeasePage() {
  const { membership, tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const [{ data: leases }, renewal, { data: occupants }] = await Promise.all([
    supabase.from("leases")
      .select("id, lease_code, start_date, end_date, monthly_rent, total_contract_rent, security_deposit, payment_frequency, payment_method, status, grace_period_days, notes, units ( unit_number, bedrooms, bathrooms, area_sqm, furnishing ), properties ( name, address )")
      .eq("tenant_id", tenantId).order("start_date", { ascending: false }),
    getTenantRenewalOffer(tenantId),
    supabase.from("occupants").select("id, name, relationship").eq("tenant_id", tenantId),
  ]);

  const all = (leases ?? []) as LeaseRow[];
  const live = all.find((l) => ["active", "expiring", "renewal_offered"].includes(l.status)) ?? all[0];

  if (!live) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={Home} title="No lease on record"
          description="Once a tenancy is created for you it appears here." />
      </PortalLayout>
    );
  }

  const unit = one(live.units);
  const property = one(live.properties);
  const daysLeft = daysUntil(live.end_date);

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Your lease</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {property?.name}{unit ? `, unit ${unit.unit_number}` : ""} · {live.lease_code}
      </p>

      {renewal && <div className="mb-6"><RenewalOfferCard offer={renewal} /></div>}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly rent" value={formatCurrency(live.monthly_rent)} icon={Wallet} />
        <StatCard label="Deposit held" value={formatCurrency(live.security_deposit)}
          sublabel="Returned at the end, less any deductions" />
        <StatCard label="Ends" value={formatDate(live.end_date)} icon={CalendarClock}
          tone={daysLeft <= 60 ? "warning" : "default"}
          sublabel={daysLeft >= 0 ? `${daysLeft} days left` : "Expired"} />
        <StatCard label="Status" value={live.status.replace(/_/g, " ")}
          tone={live.status === "active" ? "success" : "warning"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">The agreement</h2>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Reference", live.lease_code],
                ["Term", `${formatDate(live.start_date)} to ${formatDate(live.end_date)}`],
                ["Total over the term", formatCurrency(live.total_contract_rent)],
                ["Paid", live.payment_frequency],
                ["By", live.payment_method.replace(/_/g, " ")],
                ["Grace period", live.grace_period_days ? `${live.grace_period_days} days` : "None"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right capitalize text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">The home</h2>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Property", property?.name ?? "—"],
                ["Address", property?.address ?? "—"],
                ["Unit", unit?.unit_number ?? "—"],
                ["Bedrooms", unit?.bedrooms ?? "—"],
                ["Bathrooms", unit?.bathrooms ?? "—"],
                ["Size", unit?.area_sqm ? `${unit.area_sqm} m²` : "—"],
                ["Furnishing", unit?.furnishing?.replace(/_/g, " ") ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right capitalize text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {((occupants ?? []) as OccupantRow[]).length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Users className="h-4 w-4 text-neutral-400" /> Who else lives here
            </h2>
            <div className="space-y-1.5">
              {((occupants ?? []) as OccupantRow[]).map((o) => (
                <div key={o.id} className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                  <span className="text-neutral-900">{o.name}</span>
                  <span className="capitalize text-neutral-500">{o.relationship ?? "Occupant"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {all.length > 1 && (
        <>
          <h2 className="mb-3 mt-6 text-base">Previous tenancies</h2>
          <div className="stagger space-y-2">
            {all.filter((l) => l.id !== live.id).map((l) => (
              <Card key={l.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <span className="font-medium text-neutral-900">{l.lease_code}</span>
                    <p className="text-xs text-neutral-500">
                      {formatDate(l.start_date)} to {formatDate(l.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-neutral-600">{formatCurrency(l.monthly_rent)}</span>
                    <StatusBadge status={l.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
