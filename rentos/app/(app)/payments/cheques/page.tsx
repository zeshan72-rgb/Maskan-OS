import Link from "next/link";
import { CreditCard } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { ChequeStatusActions } from "@/features/payments/components/cheque-status-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";
import { CHEQUE_STATUSES } from "@/lib/validation/leases";
import type { ChequeStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "payments.manage");

  const supabase = await createClient();
  let query = supabase
    .from("cheques")
    .select(
      "id, cheque_number, bank_name, payer_name, amount, cheque_date, received_date, status, " +
        "leases ( id, lease_code, tenants ( name ) )"
    )
    .eq("organisation_id", membership.organisationId)
    .order("cheque_date", { ascending: true });

  if (status) query = query.eq("status", status as ChequeStatus);

  const { data: cheques } = await query;
  const rows = cheques ?? [];

  const held = rows.filter((c) => ["received", "stored", "due_soon"].includes(c.status));
  const dueSoon = held.filter((c) => daysUntil(c.cheque_date) <= 7);
  const bounced = rows.filter((c) => c.status === "bounced");
  const heldValue = held.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <>
      <PageHeader
        title="Cheques"
        description="Post-dated cheques held on file. A cheque only becomes a payment once it clears."
        breadcrumbs={[{ label: "Payments", href: "/payments" }, { label: "Cheques" }]}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Held on file" value={held.length} icon={CreditCard} sublabel={formatCurrency(heldValue)} />
        <StatCard
          label="Due within 7 days"
          value={dueSoon.length}
          tone={dueSoon.length > 0 ? "warning" : "default"}
          sublabel="Ready to deposit"
        />
        <StatCard
          label="Bounced"
          value={bounced.length}
          tone={bounced.length > 0 ? "danger" : "success"}
          sublabel={bounced.length > 0 ? "Needs a replacement" : "None outstanding"}
        />
        <StatCard label="Total on record" value={rows.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/payments/cheques"
          className={`rounded-full border px-3 py-1 text-xs ${
            !status ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          All
        </Link>
        {CHEQUE_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/payments/cheques?status=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={status ? "No cheques with that status" : "No cheques on file"}
          description={
            status
              ? "Clear the filter to see every cheque."
              : "Cheques are added against a lease, then submitted to the bank when they fall due."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cheque</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Lease</TableHead>
              <TableHead>Dated</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((cheque) => {
              const lease = one(cheque.leases);
              const tenant = one(lease?.tenants);
              const days = daysUntil(cheque.cheque_date);
              const pendingDeposit = ["received", "stored", "due_soon"].includes(cheque.status);
              return (
                <TableRow key={cheque.id}>
                  <TableCell className="tabular-nums font-medium text-neutral-900">{cheque.cheque_number}</TableCell>
                  <TableCell className="text-neutral-600">{cheque.bank_name}</TableCell>
                  <TableCell className="text-neutral-600">{cheque.payer_name ?? tenant?.name ?? "—"}</TableCell>
                  <TableCell>
                    {lease ? (
                      <Link href={`/leases/${lease.id}`} className="text-neutral-800 hover:underline">
                        {lease.lease_code}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {formatDate(cheque.cheque_date)}
                    {pendingDeposit && days >= 0 && days <= 7 && (
                      <span className="ml-1.5 text-xs text-amber-700">in {days}d</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(cheque.amount)}</TableCell>
                  <TableCell><StatusBadge status={cheque.status} /></TableCell>
                  <TableCell className="text-right">
                    <ChequeStatusActions
                      chequeId={cheque.id}
                      status={cheque.status as ChequeStatus}
                      canManage={canManage}
                    />
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
