import { AlertCircle, Wrench } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import { createClient } from "@/lib/supabase/server";
import { getTenantMaintenance, getTenantUnits } from "@/features/portals/tenant-queries";
import { NewMaintenanceRequestDialog } from "@/features/portals/components/tenant-components";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type MaintRow = {
  id: string; request_code: string; description: string; priority: string;
  status: string; created_at: string; category_name: string | null; latestUpdate: string | null;
};

const CLOSED = ["completed", "closed", "cancelled"];

export default async function TenantMaintenancePage() {
  const { tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const [maintenance, units, { data: categories }] = await Promise.all([
    getTenantMaintenance(tenantId),
    getTenantUnits(tenantId),
    supabase.from("maintenance_categories").select("id, name").is("organisation_id", null).order("name"),
  ]);

  const rows = maintenance as MaintRow[];
  const open = rows.filter((m) => !CLOSED.includes(m.status));
  const done = rows.filter((m) => CLOSED.includes(m.status));
  const dialog = <NewMaintenanceRequestDialog units={units} categories={categories ?? []} />;

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Repairs</h1>
          <p className="text-sm text-neutral-500">
            Report anything that needs fixing, and follow it through.
          </p>
        </div>
        {dialog}
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open" value={open.length} icon={Wrench}
          tone={open.length > 0 ? "warning" : "success"} />
        <StatCard label="Urgent"
          value={open.filter((m) => m.priority === "emergency").length}
          tone={open.some((m) => m.priority === "emergency") ? "danger" : "default"} />
        <StatCard label="Completed" value={done.length} tone="success" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Wrench} title="Nothing reported"
          description="If something breaks, tell us here and you can watch it get fixed."
          action={dialog} />
      ) : (
        <>
          {open.length > 0 && (
            <>
              <h2 className="mb-3 text-base">Still open</h2>
              <div className="stagger space-y-3">
                {open.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-xs text-neutral-500">{m.request_code}</span>
                            {m.priority === "emergency" && <Badge variant="danger">Emergency</Badge>}
                            {m.priority === "high" && <Badge variant="warning">Urgent</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-neutral-900">
                            {m.category_name ? `${m.category_name}: ` : ""}{m.description}
                          </p>
                          <p className="text-xs text-neutral-500">Reported {formatDate(m.created_at)}</p>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      {m.latestUpdate && (
                        <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                          {m.latestUpdate}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {done.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-base">Finished</h2>
              <div className="stagger space-y-2">
                {done.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-800">
                          <span className="tabular-nums text-xs text-neutral-500">{m.request_code}</span>{" "}
                          {m.description}
                        </p>
                        <p className="text-xs text-neutral-500">Reported {formatDate(m.created_at)}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className="mt-6 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
        If something is dangerous — a gas smell, water near electrics, no way to lock the
        door — call us rather than waiting here. Mark it as an emergency and we treat it
        as one.
      </p>
    </PortalLayout>
  );
}
