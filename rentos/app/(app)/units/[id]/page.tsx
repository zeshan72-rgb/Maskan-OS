import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, CalendarClock, Home, Ruler } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { UnitFormDialog } from "@/features/properties/components/unit-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "properties.manage");

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select(
      "id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, furnishing, current_rent, market_rent, status, internal_code, property_id, properties ( id, name, address )"
    )
    .eq("id", id)
    .eq("organisation_id", membership.organisationId)
    .maybeSingle();

  if (!unit) notFound();

  const [{ data: leases }, { data: maintenance }] = await Promise.all([
    supabase
      .from("leases")
      .select(
      "id, lease_code, start_date, end_date, monthly_rent, status, tenants ( id, name )"
    )
      .eq("unit_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("maintenance_requests")
      .select(
      "id, request_code, description, priority, status, created_at"
    )
      .eq("unit_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const leaseRows = leases ?? [];
  const live = leaseRows.find((l) => ["active", "expiring", "renewal_offered"].includes(l.status));
  const property = one(unit.properties);

  return (
    <>
      <PageHeader
        title={unit.unit_number}
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          ...(property ? [{ label: property.name, href: `/properties/${property.id}` }] : []),
          { label: unit.unit_number },
        ]}
        description={[unit.unit_type, unit.floor ? `Floor ${unit.floor}` : null, unit.furnishing]
          .filter(Boolean)
          .join(" · ")}
        actions={
          canManage ? (
            <UnitFormDialog
              propertyId={unit.property_id}
              initial={{
                id: unit.id,
                unit_number: unit.unit_number,
                floor: unit.floor ?? "",
                bedrooms: unit.bedrooms ?? undefined,
                bathrooms: unit.bathrooms ?? undefined,
                area_sqm: unit.area_sqm ?? undefined,
                market_rent: unit.market_rent ?? undefined,
              }}
            />
          ) : undefined
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={unit.status === "occupied" ? "Let" : unit.status} icon={Home}
          tone={unit.status === "occupied" ? "success" : unit.status === "vacant" ? "warning" : "default"} />
        <StatCard label="Current rent" value={formatCurrency(unit.current_rent ?? unit.market_rent ?? 0)}
          icon={Banknote} sublabel={unit.market_rent ? `Market ${formatCurrency(unit.market_rent)}` : undefined} />
        <StatCard label="Size" value={unit.area_sqm ? `${unit.area_sqm} m²` : "—"} icon={Ruler}
          sublabel={`${unit.bedrooms ?? 0} bed, ${unit.bathrooms ?? 0} bath`} />
        <StatCard label="Lease ends" value={live ? formatDate(live.end_date) : "—"} icon={CalendarClock}
          sublabel={live ? live.lease_code : "No active lease"} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Unit details</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Property", property?.name ?? "—"],
                ["Internal code", unit.internal_code ?? "—"],
                ["Type", unit.unit_type ?? "—"],
                ["Furnishing", unit.furnishing?.replace(/_/g, " ") ?? "—"],
                ["Floor", unit.floor ?? "—"],
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
          <CardHeader><CardTitle>Current tenancy</CardTitle></CardHeader>
          <CardContent>
            {live ? (
              <dl className="divide-y divide-neutral-100 text-sm">
                {[
                  ["Tenant", one(live.tenants)?.name ?? "—"],
                  ["Lease", live.lease_code],
                  ["Term", `${formatDate(live.start_date)} → ${formatDate(live.end_date)}`],
                  ["Rent", formatCurrency(live.monthly_rent)],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 py-2">
                    <dt className="text-neutral-500">{k}</dt>
                    <dd className="text-right text-neutral-900">{v}</dd>
                  </div>
                ))}
                <div className="pt-3">
                  <Link href={`/leases/${live.id}`} className="text-sm text-neutral-900 underline-offset-2 hover:underline">
                    Open the lease
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">This unit is not let. Create a lease to place a tenant.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-base">Lease history</h2>
      {leaseRows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No leases" description="Nothing has been let here yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease</TableHead><TableHead>Tenant</TableHead><TableHead>Term</TableHead>
              <TableHead className="text-right">Rent</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {leaseRows.map((l) => (
              <TableRow key={l.id}>
                <TableCell><Link href={`/leases/${l.id}`} className="font-medium text-neutral-900 hover:underline">{l.lease_code}</Link></TableCell>
                <TableCell className="text-neutral-600">{one(l.tenants)?.name ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{formatDate(l.start_date)} → {formatDate(l.end_date)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(l.monthly_rent)}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {(maintenance ?? []).length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-base">Recent maintenance</h2>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Ref</TableHead><TableHead>Issue</TableHead><TableHead>Raised</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody className="stagger">
              {(maintenance ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="tabular-nums font-medium text-neutral-900">{m.request_code}</TableCell>
                  <TableCell className="text-neutral-600">{m.description}</TableCell>
                  <TableCell className="text-neutral-600">{formatDate(m.created_at)}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}
