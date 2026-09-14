import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, Home, Layers } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();
  const supabase = await createClient();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, floors, properties!inner ( id, name, address, organisation_id )")
    .eq("id", id)
    .eq("properties.organisation_id", membership.organisationId)
    .maybeSingle();

  if (!building) notFound();

  const { data: units } = await supabase
    .from("units")
    .select("id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, current_rent, market_rent, status")
    .eq("building_id", id)
    .order("unit_number");

  const rows = units ?? [];
  const occupied = rows.filter((u) => u.status === "occupied").length;
  const pct = rows.length ? Math.round((occupied / rows.length) * 100) : 0;
  const property = one(building.properties);

  return (
    <>
      <PageHeader
        title={building.name}
        breadcrumbs={[
          { label: "Buildings", href: "/buildings" },
          ...(property ? [{ label: property.name, href: `/properties/${property.id}` }] : []),
          { label: building.name },
        ]}
        description={[property?.address, building.floors ? `${building.floors} floors` : null]
          .filter(Boolean).join(" · ")}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Occupancy" value={`${pct}%`} icon={Home} progress={pct}
          sublabel={`${occupied} of ${rows.length} let`} />
        <StatCard label="Units" value={rows.length} icon={Layers} />
        <StatCard label="Floors" value={building.floors ?? "—"} icon={Building} />
        <StatCard label="Monthly rent"
          value={formatCurrency(rows.filter(u => u.status === "occupied")
            .reduce((s, u) => s + (u.current_rent ?? 0), 0))}
          tone="success" sublabel="From let units" />
      </div>

      <h2 className="mb-3 text-base">Units in this building</h2>
      {rows.length === 0 ? (
        <EmptyState icon={Layers} title="No units" description="No units are assigned to this building yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead><TableHead>Floor</TableHead><TableHead>Type</TableHead>
              <TableHead>Beds / baths</TableHead><TableHead className="text-right">Rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell><Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">{u.unit_number}</Link></TableCell>
                <TableCell className="text-neutral-600">{u.floor ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{u.unit_type ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-neutral-600">{u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(u.current_rent ?? u.market_rent ?? 0)}</TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
