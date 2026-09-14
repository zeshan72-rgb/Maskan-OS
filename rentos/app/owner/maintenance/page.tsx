import { AlertCircle, Wrench } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { getOwnerMaintenance } from "@/features/portals/owner-queries";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OwnerMaintenancePage() {
  const { ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const rows = await getOwnerMaintenance(ownerId);
  const urgent = rows.filter((m) => m.priority === "emergency" || m.priority === "high");

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Repairs</h1>
      <p className="mb-6 text-sm text-neutral-500">
        What is being fixed on your properties, and where each job has reached.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open jobs" value={rows.length} icon={Wrench}
          tone={rows.length > 0 ? "warning" : "success"} />
        <StatCard label="Urgent" value={urgent.length}
          tone={urgent.length > 0 ? "danger" : "success"} />
        <StatCard label="Properties affected"
          value={new Set(rows.map((m) => m.property_name)).size} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Wrench} title="Nothing outstanding"
          description="No repair is open on your properties." />
      ) : (
        <div className="stagger space-y-3">
          {rows.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-xs text-neutral-500">{m.request_code}</span>
                      {(m.priority === "emergency" || m.priority === "high") && (
                        <Badge variant={m.priority === "emergency" ? "danger" : "warning"}>
                          {m.priority === "emergency" ? "Emergency" : "High"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-900">{m.description}</p>
                    <p className="text-xs text-neutral-500">
                      {m.property_name} · {m.unit_number} · raised {formatDate(m.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
        Repairs below the agreed spend limit are approved and carried out without troubling you.
        Anything above it waits for your decision. The limit is on your agreement.
      </p>
    </PortalLayout>
  );
}
