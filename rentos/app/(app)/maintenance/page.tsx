import Link from "next/link";
import { Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { getVendorOptions } from "@/features/maintenance/queries";
import { AssignWorkOrderDialog, MaintenanceStatusControl } from "@/features/maintenance/components/maintenance-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import { MAINTENANCE_STATUSES, MAINTENANCE_PRIORITIES } from "@/lib/validation/maintenance";
import type { MaintenanceStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { status, priority } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "maintenance.manage");

  const supabase = await createClient();
  let query = supabase
    .from("maintenance_requests")
    .select(
      "id, request_code, description, priority, status, created_at, " +
        "properties ( id, name ), units ( unit_number ), tenants ( name ), " +
        "maintenance_categories ( name ), work_orders ( id, vendors ( name ) )"
    )
    .eq("organisation_id", membership.organisationId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status as MaintenanceStatus);
  if (priority) query = query.eq("priority", priority as "low" | "normal" | "high" | "emergency");

  const [{ data: requests }, vendors] = await Promise.all([
    query,
    canManage ? getVendorOptions(membership.organisationId) : Promise.resolve([]),
  ]);

  const rows = requests ?? [];
  const open = rows.filter((r) => !["closed", "cancelled", "completed"].includes(r.status));
  const urgent = rows.filter((r) => r.priority === "emergency" && !["closed", "cancelled"].includes(r.status));
  const unassigned = open.filter((r) => (r.work_orders ?? []).length === 0);

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Requests raised by tenants and staff, and the work orders assigned against them."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open requests" value={open.length} icon={Wrench} />
        <StatCard
          label="Urgent"
          value={urgent.length}
          tone={urgent.length > 0 ? "danger" : "success"}
          sublabel={urgent.length > 0 ? "Emergency priority" : "Nothing urgent"}
        />
        <StatCard
          label="Unassigned"
          value={unassigned.length}
          tone={unassigned.length > 0 ? "warning" : "default"}
          sublabel="No vendor yet"
        />
        <StatCard label="Total on record" value={rows.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/maintenance"
          className={`rounded-full border px-3 py-1 text-xs ${
            !status && !priority
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          All
        </Link>
        {MAINTENANCE_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/maintenance?status=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={status || priority ? "Nothing matches that filter" : "No maintenance requests"}
          description={
            status || priority
              ? "Clear the filter to see everything."
              : "Tenants raise requests from their portal, and staff can log them here."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Property / unit</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Raised</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((request) => {
              const property = one(request.properties);
              const unit = one(request.units);
              const category = one(request.maintenance_categories);
              const workOrders = (request.work_orders ?? []) as { id: string; vendors: { name: string } | { name: string }[] | null }[];
              const vendor = workOrders.length > 0 ? one(workOrders[0].vendors) : null;
              return (
                <TableRow key={request.id}>
                  <TableCell className="tabular-nums font-medium text-neutral-900">{request.request_code}</TableCell>
                  <TableCell className="text-neutral-600">
                    {property?.name ?? "—"}
                    {unit ? ` · ${unit.unit_number}` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-neutral-600" title={request.description}>
                    {category?.name ? `${category.name}: ` : ""}
                    {request.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={request.priority === "emergency" ? "danger" : request.priority === "high" ? "warning" : "outline"}>
                      {MAINTENANCE_PRIORITIES.find((p) => p.value === request.priority)?.label ?? request.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-600">{formatDate(request.created_at)}</TableCell>
                  <TableCell className="text-neutral-600">{vendor?.name ?? "—"}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <MaintenanceStatusControl requestId={request.id} status={request.status as MaintenanceStatus} />
                    ) : (
                      <StatusBadge status={request.status} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <AssignWorkOrderDialog
                        requestId={request.id}
                        vendors={vendors}
                        hasWorkOrder={workOrders.length > 0}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
