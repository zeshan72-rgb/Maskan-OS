import Link from "next/link";
import { Banknote, Search } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingInstalments } from "@/features/leases/queries";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/**
 * Pick a lease, then allocate.
 *
 * Allocation is the point: a payment that is not allocated settles nothing.
 * The dialog defaults to oldest debt first and refuses a split that exceeds
 * the payment, or that over-allocates one instalment. The database enforces
 * the same rule through chk_outstanding_nonneg, so the two agree.
 */
export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ lease?: string }>;
}) {
  const { lease: leaseId } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "payments.manage");

  const supabase = await createClient();
  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, lease_code, monthly_rent, status, tenants ( name ), units ( unit_number ), properties ( name ), rent_instalments ( outstanding_amount )"
    )
    .eq("organisation_id", membership.organisationId)
    .in("status", ["active", "expiring", "renewal_offered"])
    .order("lease_code");

  type LeaseRow = {
    id: string; lease_code: string; monthly_rent: number; status: string;
    tenants: { name: string } | { name: string }[] | null;
    units: { unit_number: string } | { unit_number: string }[] | null;
    properties: { name: string } | { name: string }[] | null;
    rent_instalments: { outstanding_amount: number }[] | null;
  };
  const rows = ((leases ?? []) as LeaseRow[]).map((l) => ({
    id: l.id,
    lease_code: l.lease_code,
    monthly_rent: Number(l.monthly_rent),
    tenants: l.tenants,
    units: l.units,
    properties: l.properties,
    owed: (l.rent_instalments ?? []).reduce((s, i) => s + Number(i.outstanding_amount), 0),
  }));
  const inArrears = rows.filter((l) => l.owed > 0).sort((a, b) => b.owed - a.owed);

  const selected = leaseId ? rows.find((l) => l.id === leaseId) : undefined;
  const instalments = selected
    ? await getOutstandingInstalments(membership.organisationId, selected.id)
    : [];

  return (
    <>
      <PageHeader
        title="Allocate a payment"
        description="Choose the lease, then split the money across the months it settles."
        actions={
          <Link href="/payments">
            <Button variant="outline" size="sm">All payments</Button>
          </Link>
        }
      />

      {selected ? (
        <Card className="mb-5">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Selected lease</p>
                <p className="mt-1 font-display text-lg font-extrabold tracking-tight text-neutral-900">
                  {selected.lease_code}
                </p>
                <p className="text-sm text-neutral-600">
                  {one(selected.tenants)?.name} · {one(selected.properties)?.name} ·{" "}
                  {one(selected.units)?.unit_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Outstanding</p>
                <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums tracking-tight ${selected.owed > 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {formatCurrency(selected.owed)}
                </p>
                <p className="text-xs text-neutral-500">{instalments.length} unpaid instalments</p>
              </div>
            </div>

            {instalments.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-neutral-200 pt-4">
                {instalments.slice(0, 6).map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">
                      #{i.instalment_number} · due {formatDate(i.due_date)}
                    </span>
                    <span className="tabular-nums text-neutral-900">
                      {formatCurrency(i.outstanding_amount)}
                      {Number(i.outstanding_amount) < Number(i.original_amount) && (
                        <span className="ml-1.5 text-xs text-amber-700">part paid</span>
                      )}
                    </span>
                  </div>
                ))}
                {instalments.length > 6 && (
                  <p className="pt-1 text-xs text-neutral-400">
                    and {instalments.length - 6} more
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {canManage && (
                <RecordPaymentDialog leaseId={selected.id} instalments={instalments} />
              )}
              <Link href="/record-payment">
                <Button variant="outline" size="sm">Choose another lease</Button>
              </Link>
              <Link href={`/leases/${selected.id}`}>
                <Button variant="outline" size="sm">Open the lease</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
            <Search className="h-4 w-4" />
            Leases in arrears first. Pick one to allocate against.
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={Banknote} title="No active leases" description="Nothing to allocate against yet." />
          ) : (
            <div className="stagger space-y-2">
              {[...inArrears, ...rows.filter((l) => l.owed === 0)].map((l) => (
                <Link key={l.id} href={`/record-payment?lease=${l.id}`} className="block">
                  <Card className="transition-colors hover:border-neutral-300">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {one(l.tenants)?.name ?? "—"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {l.lease_code} · {one(l.properties)?.name} · {one(l.units)?.unit_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500">
                          {formatCurrency(l.monthly_rent)} a month
                        </span>
                        {l.owed > 0 ? (
                          <Badge variant="danger">{formatCurrency(l.owed)} owed</Badge>
                        ) : (
                          <Badge variant="success">Up to date</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
