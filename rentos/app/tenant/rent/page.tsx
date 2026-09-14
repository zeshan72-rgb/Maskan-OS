import { AlertCircle, Banknote, CalendarClock, Receipt } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import {
  getTenantHome, getTenantRentSchedule, getTenantPayments,
} from "@/features/portals/tenant-queries";
import { SubmitPaymentProofDialog, CopyableReference } from "@/features/portals/components/tenant-components";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type ScheduleRow = {
  id: string; instalment_number: number; due_date: string;
  original_amount: number; outstanding_amount: number; status: string;
};
type PaymentRow = {
  id: string; amount: number; method: string; status: string; reference: string | null;
  paid_at: string; rejected_reason: string | null; receipt_number: string | null;
};

export default async function TenantRentPage() {
  const { membership, tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const [home, schedule, payments] = await Promise.all([
    getTenantHome(membership.organisationId, tenantId),
    getTenantRentSchedule(tenantId),
    getTenantPayments(tenantId),
  ]);

  const rows = schedule as ScheduleRow[];
  const pays = payments as PaymentRow[];
  const paidCount = rows.filter((i) => i.status === "paid").length;

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Rent</h1>
      <p className="mb-6 text-sm text-neutral-500">
        What you owe, when it falls due, and everything you have paid.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Next due"
          value={home.nextInstalment ? formatCurrency(home.nextInstalment.outstanding_amount) : "Nothing due"}
          icon={CalendarClock} tone={home.totals.overdue > 0 ? "danger" : "default"}
          sublabel={home.nextInstalment ? formatDate(home.nextInstalment.due_date) : "You are up to date"} />
        <StatCard label="Outstanding" value={formatCurrency(home.totals.outstanding)}
          tone={home.totals.overdue > 0 ? "danger" : home.totals.outstanding > 0 ? "warning" : "success"}
          sublabel={home.totals.overdue > 0 ? `${formatCurrency(home.totals.overdue)} overdue` : "Nothing overdue"} />
        <StatCard label="Paid to date" value={formatCurrency(home.totals.paidToDate)} icon={Banknote} tone="success" />
        <StatCard label="Months settled" value={`${paidCount} of ${rows.length}`}
          progress={rows.length ? Math.round((paidCount / rows.length) * 100) : 0} />
      </div>

      {home.lease && home.bankAccount && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-neutral-900">How to pay</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Transfer to the account below, quoting the reference so it matches to your rent
              automatically. Then send us the receipt.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Bank</span>
                  <span className="text-neutral-900">{home.bankAccount.bank_name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Account name</span>
                  <span className="text-right text-neutral-900">{home.bankAccount.account_name}</span>
                </div>
                {home.bankAccount.iban && <CopyableReference label="IBAN" value={home.bankAccount.iban} />}
                {home.paymentReference && <CopyableReference label="Reference" value={home.paymentReference} />}
              </div>
              <div className="flex items-end justify-start sm:justify-end">
                <SubmitPaymentProofDialog
                  leaseId={home.lease.id}
                  amountDue={home.nextInstalment?.outstanding_amount ?? 0}
                  reference={home.paymentReference}
                />
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              A transfer without the reference still reaches us, but it has to be matched by
              hand and may show as outstanding for a day or two longer.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule ({rows.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({pays.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          {rows.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No schedule yet"
              description="Your instalments appear once the lease is active." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead><TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="tabular-nums text-neutral-500">{i.instalment_number}</TableCell>
                    <TableCell className="text-neutral-800">{formatDate(i.due_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(i.original_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.outstanding_amount > 0
                        ? <span className="text-red-700">{formatCurrency(i.outstanding_amount)}</span>
                        : <span className="text-neutral-400">—</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {pays.length === 0 ? (
            <EmptyState icon={Receipt} title="No payments yet"
              description="Anything you pay, or that we record for you, appears here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {pays.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-neutral-600">{formatDate(p.paid_at)}</TableCell>
                    <TableCell className="capitalize text-neutral-600">{p.method.replace(/_/g, " ")}</TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{p.reference ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                      {p.rejected_reason && <p className="mt-1 text-xs text-red-700">{p.rejected_reason}</p>}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{p.receipt_number ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
