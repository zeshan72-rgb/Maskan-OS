import { AlertCircle, PieChart } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { createClient } from "@/lib/supabase/server";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/**
 * Ownership splits.
 *
 * An asset can be held by more than one owner, and the share decides how
 * every statement apportions. Showing an owner their percentage alongside
 * anyone else's is what makes a split statement legible rather than
 * mysterious.
 */
export default async function OwnerOwnershipPage() {
  const { ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const [{ data: propShares }, { data: unitShares }] = await Promise.all([
    supabase.from("property_owners")
      .select(
      "ownership_percentage, properties ( id, name, address, units ( id ) )"
    )
      .eq("owner_id", ownerId),
    supabase.from("unit_owners")
      .select(
      "ownership_percentage, units ( id, unit_number, status, properties ( name ) )"
    )
      .eq("owner_id", ownerId),
  ]);

  const props = propShares ?? [];
  const units = unitShares ?? [];
  const wholeOwned = props.filter((p) => Number(p.ownership_percentage) === 100).length;
  const shared = props.filter((p) => Number(p.ownership_percentage) < 100).length;

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Ownership</h1>
      <p className="mb-6 text-sm text-neutral-500">
        What you hold, and in what share. Your percentage is what every statement apportions by.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Properties held" value={props.length} icon={PieChart} />
        <StatCard label="Owned outright" value={wholeOwned} tone="success" />
        <StatCard label="Shared with others" value={shared}
          tone={shared > 0 ? "info" : "default"} sublabel={shared > 0 ? "Statements are apportioned" : undefined} />
      </div>

      {props.length === 0 && units.length === 0 ? (
        <EmptyState icon={PieChart} title="No ownership recorded"
          description="Nothing is registered in your name yet." />
      ) : (
        <>
          {props.length > 0 && (
            <>
              <h2 className="mb-3 text-base">Whole properties</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead><TableHead>Address</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Your share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="stagger">
                  {props.map((p, i) => {
                    const prop = one(p.properties);
                    const share = Number(p.ownership_percentage);
                    return (
                      <TableRow key={prop?.id ?? i}>
                        <TableCell className="font-medium text-neutral-900">{prop?.name ?? "—"}</TableCell>
                        <TableCell className="text-neutral-600">{prop?.address ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-neutral-600">
                          {((prop?.units ?? []) as unknown[]).length}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={share === 100 ? "success" : "info"}>{share}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          {units.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-base">Individual units</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead><TableHead>Property</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Your share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="stagger">
                  {units.map((u, i) => {
                    const unit = one(u.units);
                    const share = Number(u.ownership_percentage);
                    return (
                      <TableRow key={unit?.id ?? i}>
                        <TableCell className="font-medium text-neutral-900">{unit?.unit_number ?? "—"}</TableCell>
                        <TableCell className="text-neutral-600">{one(unit?.properties)?.name ?? "—"}</TableCell>
                        <TableCell className="capitalize text-neutral-600">{unit?.status ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={share === 100 ? "success" : "info"}>{share}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          {shared > 0 && (
            <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
              Where a property is shared, your statement shows only your percentage of the rent
              and of the costs. The other holders receive their own.
            </p>
          )}
        </>
      )}
    </PortalLayout>
  );
}
