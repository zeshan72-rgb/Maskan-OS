import Link from "next/link";
import { Building } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function BuildingsPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  // buildings has no organisation_id of its own; it hangs off properties.
  const { data } = await supabase
    .from("buildings")
    .select(
      "id, name, floors, created_at, properties!inner ( id, name, organisation_id ), units ( id, status )"
    )
    .eq("properties.organisation_id", membership.organisationId)
    .order("name");

  const rows = data ?? [];
  const totalUnits = rows.reduce((s, b) => s + (b.units ?? []).length, 0);
  const occupied = rows.reduce(
    (s, b) => s + ((b.units ?? []) as { status: string }[]).filter((u) => u.status === "occupied").length, 0);

  return (
    <>
      <PageHeader
        title="Buildings"
        description="Towers and blocks within your properties. A unit belongs to a building, and a building to a property."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Buildings" value={rows.length} icon={Building} />
        <StatCard label="Units in buildings" value={totalUnits} />
        <StatCard label="Occupied" value={occupied} tone="success" />
        <StatCard label="Vacant" value={totalUnits - occupied} tone={totalUnits - occupied > 0 ? "warning" : "default"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No buildings recorded"
          description="Buildings are optional. Use them when a property has more than one tower or block, so units can be grouped."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Building</TableHead><TableHead>Property</TableHead>
              <TableHead className="text-right">Floors</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Occupied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((b) => {
              const p = one(b.properties);
              const units = (b.units ?? []) as { status: string }[];
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/buildings/${b.id}`} className="font-medium text-neutral-900 hover:underline">{b.name}</Link>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {p ? <Link href={`/properties/${p.id}`} className="hover:underline">{p.name}</Link> : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-neutral-600">{b.floors ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{units.length}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {units.filter((u) => u.status === "occupied").length}
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
