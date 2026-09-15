import Link from "next/link";
import { DoorOpen, TrendingDown } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function VacancyPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("units")
    .select(
      "id, unit_number, bedrooms, area_sqm, unit_type, market_rent, updated_at, properties ( id, name, address )"
    )
    .eq("organisation_id", membership.organisationId)
    .eq("status", "vacant")
    .is("archived_at", null)
    .order("updated_at");

  const rows = data ?? [];

  // Days empty is measured from updated_at, which is when the unit last
  // changed state. The prototype tracks a dedicated vacant_since column;
  // this schema has no such field, so the figure is an approximation.
  // TODO: add units.vacant_since and set it when a lease ends.
  const daysEmpty = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

  const rentForgone = rows.reduce(
    (sum, u) => sum + Math.round(((u.market_rent ?? 0) / 30) * daysEmpty(u.updated_at)),
    0
  );
  const longest = rows.length ? Math.max(...rows.map((u) => daysEmpty(u.updated_at))) : 0;

  return (
    <>
      <PageHeader
        title="Vacant units"
        description="What is empty, how long it has been empty, and what that has cost."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vacant units" value={rows.length} icon={DoorOpen}
          tone={rows.length > 0 ? "warning" : "success"} />
        <StatCard label="Rent forgone" value={formatCurrency(rentForgone)} icon={TrendingDown}
          tone={rentForgone > 0 ? "danger" : "success"} sublabel="Since each fell vacant" />
        <StatCard label="Longest empty" value={`${longest} days`}
          tone={longest > 60 ? "danger" : longest > 30 ? "warning" : "default"} />
        <StatCard label="Monthly value" value={formatCurrency(rows.reduce((s, u) => s + (u.market_rent ?? 0), 0))}
          sublabel="If all were let at asking" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Nothing vacant" description="Every unit in the portfolio is let." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead><TableHead>Property</TableHead><TableHead>Type</TableHead>
              <TableHead className="text-right">Asking</TableHead>
              <TableHead className="text-right">Days empty</TableHead>
              <TableHead className="text-right">Rent forgone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((u) => {
              const p = one(u.properties);
              const days = daysEmpty(u.updated_at);
              const lost = Math.round(((u.market_rent ?? 0) / 30) * days);
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">{u.unit_number}</Link>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {p ? <Link href={`/properties/${p.id}`} className="hover:underline">{p.name}</Link> : "—"}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {u.unit_type ?? "—"}
                    {u.area_sqm ? <span className="text-xs text-neutral-400"> · {u.area_sqm} m²</span> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(u.market_rent ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant={days > 60 ? "danger" : days > 30 ? "warning" : "neutral"}>{days}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-700">{formatCurrency(lost)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Days empty is measured from when the unit last changed state. A dedicated vacant-since
        field would be more precise; see the TODO in this file.
      </p>
    </>
  );
}
