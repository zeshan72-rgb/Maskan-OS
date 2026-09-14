import Link from "next/link";
import { Layers } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import { UNIT_STATUSES } from "@/lib/validation/entities";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { membership } = await requireStaff();
  const supabase = await createClient();

  // Every unit across the portfolio. listUnitsForProperty is scoped to one
  // property, so this reads directly.
  let query = supabase
    .from("units")
    .select(
      "id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, furnishing, " +
        "current_rent, market_rent, status, properties ( id, name ), " +
        "leases ( id, status, tenants ( name ) )"
    )
    .eq("organisation_id", membership.organisationId)
    .is("archived_at", null)
    .order("unit_number");

  if (status) query = query.eq("status", status as "vacant" | "occupied" | "reserved" | "maintenance" | "inactive");

  const { data } = await query;
  const rows = data ?? [];
  const count = (s: string) => rows.filter((u) => u.status === s).length;

  return (
    <>
      <PageHeader title="Units" description={`${rows.length} unit${rows.length === 1 ? "" : "s"} across every property.`} />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={rows.length} icon={Layers} />
        <StatCard label="Occupied" value={count("occupied")} tone="success" />
        <StatCard label="Vacant" value={count("vacant")} tone={count("vacant") > 0 ? "warning" : "default"} />
        <StatCard label="In maintenance" value={count("maintenance")} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/units" className={`rounded-full border px-3 py-1 text-xs ${!status ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>All</Link>
        {UNIT_STATUSES.map((s) => (
          <Link key={s.value} href={`/units?status=${s.value}`} className={`rounded-full border px-3 py-1 text-xs ${status === s.value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
            {s.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Layers} title="No units" description="Units are added from a property page." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Beds</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((u) => {
              const property = one(u.properties);
              const leases = (u.leases ?? []) as { status: string; tenants: { name: string } | { name: string }[] | null }[];
              const live = leases.find((l) => ["active", "expiring", "renewal_offered"].includes(l.status));
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">
                      {u.unit_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {property ? (
                      <Link href={`/properties/${property.id}`} className="hover:underline">{property.name}</Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-neutral-600">{u.unit_type ?? "—"}</TableCell>
                  <TableCell className="tabular-nums text-neutral-600">{u.bedrooms ?? "—"}</TableCell>
                  <TableCell className="text-neutral-600">{one(live?.tenants)?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(u.current_rent ?? u.market_rent ?? 0)}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
