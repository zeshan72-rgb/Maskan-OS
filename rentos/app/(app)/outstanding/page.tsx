import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getArrearsAgeing } from "@/features/payments/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const BUCKET_TONE = {
  current: "neutral", "1-30": "warning", "31-60": "warning", "61-90": "danger", "90+": "danger",
} as const;

const BUCKET_LABEL = {
  current: "Not yet due", "1-30": "1 to 30 days", "31-60": "31 to 60 days",
  "61-90": "61 to 90 days", "90+": "Over 90 days",
} as const;

export default async function OutstandingPage() {
  const { membership } = await requireStaff();
  const { rows, buckets } = await getArrearsAgeing(membership.organisationId);

  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const overdue = total - buckets.current;

  return (
    <>
      <PageHeader
        title="Outstanding rent"
        description="Who owes what, and for how long. Aged from the oldest unpaid instalment on each lease."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Not yet due" value={formatCurrency(buckets.current)} icon={Clock} />
        <StatCard label="1 to 30 days" value={formatCurrency(buckets["1-30"])} tone="warning" />
        <StatCard label="31 to 60 days" value={formatCurrency(buckets["31-60"])} tone="warning" />
        <StatCard label="61 to 90 days" value={formatCurrency(buckets["61-90"])} tone="danger" />
        <StatCard label="Over 90 days" value={formatCurrency(buckets["90+"])} tone="danger" icon={AlertTriangle} />
      </div>

      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">Total outstanding</p>
            <p className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-neutral-900">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Of which overdue</p>
            <p className={`font-display text-2xl font-extrabold tabular-nums tracking-tight ${overdue > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {formatCurrency(overdue)}
            </p>
          </div>
        </div>
        {/* A single bar showing how the debt is distributed across the ageing
            buckets. Where the money sits matters more than the headline. */}
        {total > 0 && (
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-100">
            {(["current", "1-30", "31-60", "61-90", "90+"] as const).map((b) =>
              buckets[b] > 0 ? (
                <div key={b} title={`${BUCKET_LABEL[b]}: ${formatCurrency(buckets[b])}`}
                  style={{ width: `${(buckets[b] / total) * 100}%` }}
                  className={
                    b === "current" ? "bg-neutral-300"
                    : b === "1-30" || b === "31-60" ? "bg-amber-500" : "bg-red-600"
                  } />
              ) : null
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Clock} title="Nothing outstanding" description="Every instalment is settled." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead><TableHead>Property / unit</TableHead>
              <TableHead>Oldest unpaid</TableHead><TableHead>Age</TableHead>
              <TableHead className="text-right">Owed</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((r) => (
              <TableRow key={r.lease_id}>
                <TableCell className="font-medium text-neutral-900">{r.tenant_name}</TableCell>
                <TableCell className="text-neutral-600">{r.property_name} · {r.unit_number}</TableCell>
                <TableCell className="text-neutral-600">{formatDate(r.oldestDueDate)}</TableCell>
                <TableCell><Badge variant={BUCKET_TONE[r.bucket]}>{BUCKET_LABEL[r.bucket]}</Badge></TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(r.amount)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/leases/${r.lease_id}`} className="text-sm text-neutral-900 underline-offset-2 hover:underline">
                    Open lease
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
