import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { getArrearsAgeing } from "@/features/payments/queries";
import { PaymentVerificationActions } from "@/features/payments/components/payment-verification-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PAYMENT_METHODS } from "@/lib/validation/leases";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function PaymentsPage() {
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "payments.manage");

  const supabase = await createClient();
  const [{ data: payments }, ageing] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, status, reference, payer_name, paid_at, created_at, leases ( id, lease_code ), tenants ( id, name )")
      .eq("organisation_id", membership.organisationId)
      .order("paid_at", { ascending: false })
      .limit(100),
    getArrearsAgeing(membership.organisationId),
  ]);

  const rows = payments ?? [];
  const pending = rows.filter((p) => p.status === "pending_verification");
  const confirmed = rows.filter((p) => p.status === "confirmed");

  const table = (list: typeof rows, showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Received</TableHead>
          <TableHead>Lease</TableHead>
          <TableHead>Payer</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody className="stagger">
        {list.map((payment) => {
          const lease = one(payment.leases);
          const tenant = one(payment.tenants);
          return (
            <TableRow key={payment.id}>
              <TableCell className="text-neutral-600">{formatDate(payment.paid_at)}</TableCell>
              <TableCell>
                {lease ? (
                  <Link href={`/leases/${lease.id}`} className="text-neutral-900 hover:underline">
                    {lease.lease_code}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-neutral-600">{payment.payer_name ?? tenant?.name ?? "—"}</TableCell>
              <TableCell className="text-neutral-600">
                {PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? payment.method}
              </TableCell>
              <TableCell className="tabular-nums text-neutral-600">{payment.reference ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(payment.amount)}</TableCell>
              <TableCell><StatusBadge status={payment.status} /></TableCell>
              {showActions && (
                <TableCell className="text-right">
                  {canManage && <PaymentVerificationActions paymentId={payment.id} amount={Number(payment.amount)} />}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Everything received, and what it settled. Allocation happens against instalments on the lease."
        actions={
          <Link
            href="/payments/cheques"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Cheques
          </Link>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current" value={formatCurrency(ageing.buckets.current)} sublabel="Not yet due" />
        <StatCard label="1 to 30 days" value={formatCurrency(ageing.buckets["1-30"])} tone="warning" />
        <StatCard label="31 to 60 days" value={formatCurrency(ageing.buckets["31-60"])} tone="warning" />
        <StatCard
          label="Over 60 days"
          value={formatCurrency(ageing.buckets["61-90"] + ageing.buckets["90+"])}
          tone="danger"
          sublabel={`${ageing.rows.length} lease${ageing.rows.length === 1 ? "" : "s"} in arrears`}
        />
      </div>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "all"}>
        <TabsList>
          <TabsTrigger value="pending">Awaiting verification ({pending.length})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({confirmed.length})</TabsTrigger>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nothing awaiting verification"
              description="Payments submitted from the tenant portal land here for a human to confirm."
            />
          ) : (
            table(pending, true)
          )}
        </TabsContent>

        <TabsContent value="confirmed">
          {confirmed.length === 0 ? (
            <EmptyState icon={Receipt} title="No confirmed payments" description="Confirmed payments appear here." />
          ) : (
            table(confirmed, false)
          )}
        </TabsContent>

        <TabsContent value="all">
          {rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments recorded"
              description="Record a payment from a lease, or clear a cheque, and it appears here."
            />
          ) : (
            table(rows, false)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
