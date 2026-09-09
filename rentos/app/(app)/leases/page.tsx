import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { getLeasableUnits, getTenantOptions } from "@/features/leases/queries";
import { getPropertyOptions, getOwnerOptions } from "@/features/properties/queries";
import { LeaseWizard } from "@/features/leases/components/lease-wizard";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";
import { LEASE_STATUSES } from "@/lib/validation/leases";

export const dynamic = "force-dynamic";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "leases.manage");

  const supabase = await createClient();
  let query = supabase
    .from("leases")
    .select(
      "id, lease_code, start_date, end_date, monthly_rent, status, " +
        "properties ( id, name ), units ( id, unit_number ), tenants ( id, name )"
    )
    .eq("organisation_id", membership.organisationId)
    .order("end_date", { ascending: true });

  if (status) query = query.eq("status", status);

  const [{ data: leases }, properties, units, tenants, owners] = await Promise.all([
    query,
    canManage ? getPropertyOptions(membership.organisationId) : Promise.resolve([]),
    canManage ? getLeasableUnits(membership.organisationId) : Promise.resolve([]),
    canManage ? getTenantOptions(membership.organisationId) : Promise.resolve([]),
    canManage ? getOwnerOptions(membership.organisationId) : Promise.resolve([]),
  ]);

  const rows = leases ?? [];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const wizard = canManage ? (
    <LeaseWizard properties={properties} units={units} tenants={tenants} owners={owners} />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Leases"
        description={`${rows.length} lease${rows.length === 1 ? "" : "s"}${status ? ` with status ${status}` : ""}.`}
        actions={wizard}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/leases"
          className={`rounded-full border px-3 py-1 text-xs ${
            !status ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          All
        </Link>
        {LEASE_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/leases?status=${s.value}`}
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
          icon={FileText}
          title={status ? "No leases with that status" : "No leases yet"}
          description={
            status
              ? "Clear the filter to see every lease."
              : "Create a lease against a vacant unit. Activating it generates the rent schedule."
          }
          action={!status ? wizard : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease</TableHead>
              <TableHead>Property / unit</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Term</TableHead>
              <TableHead className="text-right">Monthly rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((lease) => {
              const property = one(lease.properties);
              const unit = one(lease.units);
              const tenant = one(lease.tenants);
              const days = daysUntil(lease.end_date);
              return (
                <TableRow key={lease.id}>
                  <TableCell>
                    <Link href={`/leases/${lease.id}`} className="font-medium text-neutral-900 hover:underline">
                      {lease.lease_code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {property?.name ?? "—"}
                    {unit ? ` · ${unit.unit_number}` : ""}
                  </TableCell>
                  <TableCell className="text-neutral-600">{tenant?.name ?? "—"}</TableCell>
                  <TableCell className="text-neutral-600">
                    {formatDate(lease.start_date)} → {formatDate(lease.end_date)}
                    {days >= 0 && days <= 90 && (
                      <span className="ml-1.5 text-xs text-amber-700">{days}d left</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(lease.monthly_rent)}</TableCell>
                  <TableCell>
                    <StatusBadge status={lease.status} />
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
