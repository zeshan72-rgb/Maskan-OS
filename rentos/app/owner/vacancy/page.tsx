import { AlertCircle, DoorOpen, TrendingDown } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { createClient } from "@/lib/supabase/server";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function OwnerVacancyPage() {
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
  // Units in properties this owner holds, that are currently empty.
  const { data: shares } = await supabase
    .from("property_owners").select(
      "property_id"
    ).eq("owner_id", ownerId);
  const propertyIds = (shares ?? []).map((s) => s.property_id);

  const { data: units } = propertyIds.length
    ? await supabase
        .from("units")
        .select(
      "id, unit_number, bedrooms, area_sqm, unit_type, market_rent, updated_at, properties ( name )"
    )
        .in("property_id", propertyIds)
        .eq("status", "vacant")
        .order("updated_at")
    : { data: [] };

  const rows = units ?? [];
  // TODO: units has no vacant_since column, so this is measured from the
  // last state change. See the same note on the staff vacancy screen.
  const days = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  const forgone = rows.reduce((s, u) => s + Math.round(((u.market_rent ?? 0) / 30) * days(u.updated_at)), 0);

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Your empty units</h1>
      <p className="mb-6 text-sm text-neutral-500">
        What is not earning, how long it has been that way, and what it has cost you.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Empty units" value={rows.length} icon={DoorOpen}
          tone={rows.length > 0 ? "warning" : "success"} />
        <StatCard label="Rent forgone" value={formatCurrency(forgone)} icon={TrendingDown}
          tone={forgone > 0 ? "danger" : "success"} sublabel="Since each fell empty" />
        <StatCard label="Monthly value"
          value={formatCurrency(rows.reduce((s, u) => s + (u.market_rent ?? 0), 0))}
          sublabel="If all were let at asking" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Everything is let"
          description="No unit of yours is currently empty." />
      ) : (
        <div className="stagger space-y-3">
          {rows.map((u) => {
            const d = days(u.updated_at);
            const lost = Math.round(((u.market_rent ?? 0) / 30) * d);
            return (
              <Card key={u.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-neutral-900">{u.unit_number}</h2>
                      <p className="text-sm text-neutral-500">
                        {one(u.properties)?.name}
                        {u.unit_type ? `, ${u.unit_type}` : ""}
                        {u.area_sqm ? `, ${u.area_sqm} m²` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={d > 60 ? "danger" : d > 30 ? "warning" : "neutral"}>{d} days empty</Badge>
                      <p className="mt-1 text-xs text-neutral-500">since {formatDate(u.updated_at)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm">
                    <span className="text-neutral-600">
                      Asking <span className="tabular-nums text-neutral-900">{formatCurrency(u.market_rent ?? 0)}</span>
                    </span>
                    <span className="text-neutral-600">
                      Forgone <span className="tabular-nums text-red-700">{formatCurrency(lost)}</span>
                    </span>
                  </div>
                  {d > 60 && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                      Empty for over two months. Worth a conversation about the asking rent.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}
