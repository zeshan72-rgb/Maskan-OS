import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Home, Layers, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { getProperty, listUnitsForProperty, getOwnerOptions } from "@/features/properties/queries";
import { PropertyForm } from "@/features/properties/components/property-form";
import { UnitFormDialog } from "@/features/properties/components/unit-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import { PROPERTY_TYPES } from "@/lib/validation/entities";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "properties.manage");

  const property = await getProperty(membership.organisationId, id);
  if (!property) notFound();

  const [units, owners] = await Promise.all([
    listUnitsForProperty(membership.organisationId, id),
    canManage ? getOwnerOptions(membership.organisationId) : Promise.resolve([]),
  ]);

  const occupancyPct =
    property.stats.units > 0 ? Math.round((property.stats.occupied / property.stats.units) * 100) : 0;

  return (
    <>
      <PageHeader
        title={property.name}
        breadcrumbs={[{ label: "Properties", href: "/properties" }, { label: property.name }]}
        description={[property.property_code, property.address].filter(Boolean).join(" · ")}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <PropertyForm
                owners={owners}
                mode="edit"
                initial={{
                  id: property.id,
                  name: property.name,
                  property_code: property.property_code,
                  type: property.type,
                  address: property.address ?? "",
                }}
              />
              <UnitFormDialog propertyId={property.id} />
            </div>
          ) : undefined
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          icon={Home}
          progress={occupancyPct}
          sublabel={`${property.stats.occupied} of ${property.stats.units} let`}
        />
        <StatCard label="Units" value={property.stats.units} icon={Layers} sublabel={`${property.stats.vacant} vacant`} />
        <StatCard label="Active leases" value={property.stats.activeLeases} icon={Building2} />
        <StatCard
          label="Monthly rent"
          value={formatCurrency(property.stats.monthlyRent)}
          icon={Wallet}
          tone="success"
          sublabel="From let units"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[
                ["Code", property.property_code],
                ["Type", PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type],
                ["Address", property.address ?? "—"],
                [
                  "Management fee",
                  property.management_fee_value
                    ? property.management_fee_type === "percentage"
                      ? `${property.management_fee_value}% of rent collected`
                      : formatCurrency(property.management_fee_value)
                    : "—",
                ],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Ownership</CardTitle></CardHeader>
          <CardContent>
            {property.owners.length === 0 ? (
              <p className="text-sm text-neutral-500">No owner is recorded against this property.</p>
            ) : (
              <div className="space-y-2">
                {property.owners.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <Link href={`/owners/${o.id}`} className="text-sm font-medium text-neutral-900 hover:underline">
                      {o.name}
                    </Link>
                    <Badge variant="outline">{o.ownership_percentage}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-base">Units</h2>
      {units.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No units yet"
          description="Add units to this property before letting them."
          action={canManage ? <UnitFormDialog propertyId={property.id} /> : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Beds / baths</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">
                    {u.unit_number}
                  </Link>
                  {u.floor && <p className="text-xs text-neutral-500">Floor {u.floor}</p>}
                </TableCell>
                <TableCell className="text-neutral-600">{u.unit_type ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-neutral-600">
                  {u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums text-neutral-600">
                  {u.area_sqm ? `${u.area_sqm} m²` : "—"}
                </TableCell>
                <TableCell className="text-neutral-600">{u.tenant_name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(u.current_rent ?? u.market_rent ?? 0)}
                </TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
