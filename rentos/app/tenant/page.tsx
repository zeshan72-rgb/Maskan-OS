import { AlertCircle, Banknote, CalendarClock, FileText, Home, Receipt, Wrench } from "lucide-react";
import { requireRole } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import {
  getTenantHome,
  getTenantRentSchedule,
  getTenantPayments,
  getTenantMaintenance,
  getTenantRenewalOffer,
  getTenantDocuments,
  getTenantUnits,
} from "@/features/portals/tenant-queries";
import {
  SubmitPaymentProofDialog,
  CopyableReference,
  NewMaintenanceRequestDialog,
  RenewalOfferCard,
} from "@/features/portals/components/tenant-components";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * getTenantRentSchedule and getTenantDocuments have no declared return type,
 * and the typed ones reference enums from types/database, which is affected
 * by the project-wide inference problem. These shapes mirror the columns the
 * queries select; remove them once the types file is regenerated.
 */
type ScheduleRow = {
  id: string;
  instalment_number: number;
  due_date: string;
  original_amount: number;
  outstanding_amount: number;
  status: string;
};
type PaymentRow = {
  id: string; amount: number; method: string; status: string;
  reference: string | null; paid_at: string;
  rejected_reason: string | null; receipt_number: string | null;
};
type MaintenanceRow = {
  id: string; request_code: string; description: string; priority: string;
  status: string; created_at: string; category_name: string | null;
  latestUpdate: string | null;
};
type DocumentRow = { id: string; title: string; category: string; created_at: string };


export default async function TenantPortalPage() {
  // requireRole redirects a non-tenant to /forbidden, and a signed-out
  // visitor to /sign-in, so nothing below needs to re-check.
  const { membership } = await requireRole("tenant");
  const tenantId = membership.tenantId;

  if (!tenantId) {
    return (
      <PortalLayout title="Tenant">
        <EmptyState
          icon={AlertCircle}
          title="Your account is not linked to a tenancy"
          description="The tenant role is set, but no tenant record is attached to this account. An administrator needs to link it."
        />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const [home, schedule, payments, maintenance, renewal, documents, units, { data: categories }] =
    await Promise.all([
      getTenantHome(membership.organisationId, tenantId),
      getTenantRentSchedule(tenantId),
      getTenantPayments(tenantId),
      getTenantMaintenance(tenantId),
      getTenantRenewalOffer(tenantId),
      getTenantDocuments(tenantId),
      getTenantUnits(tenantId),
      supabase.from("maintenance_categories").select("id, name").is("organisation_id", null).order("name"),
    ]);

  return (
    <PortalLayout title="Tenant">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">
          {home.lease ? `${home.lease.property_name}, unit ${home.lease.unit_number}` : "Your tenancy"}
        </h1>
        <p className="text-sm text-neutral-500">
          {home.lease
            ? `${home.lease.lease_code} · ${formatDate(home.lease.start_date)} to ${formatDate(home.lease.end_date)}`
            : "No active lease on record."}
        </p>
      </div>

      {renewal && (
        <div className="mb-6">
          <RenewalOfferCard offer={renewal} />
        </div>
      )}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Next payment due"
          value={home.nextInstalment ? formatCurrency(home.nextInstalment.outstanding_amount) : "Nothing due"}
          icon={CalendarClock}
          tone={home.totals.overdue > 0 ? "danger" : "default"}
          sublabel={home.nextInstalment ? formatDate(home.nextInstalment.due_date) : "You are up to date"}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(home.totals.outstanding)}
          tone={home.totals.overdue > 0 ? "danger" : home.totals.outstanding > 0 ? "warning" : "success"}
          sublabel={home.totals.overdue > 0 ? `${formatCurrency(home.totals.overdue)} overdue` : "Nothing overdue"}
        />
        <StatCard label="Paid to date" value={formatCurrency(home.totals.paidToDate)} icon={Banknote} tone="success" />
        <StatCard
          label="Open requests"
          value={home.openRequests}
          icon={Wrench}
          sublabel={home.pendingPayments > 0 ? `${home.pendingPayments} payment awaiting review` : undefined}
        />
      </div>

      {home.lease && home.bankAccount && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How to pay</CardTitle>
            <CardDescription>
              Transfer to the account below, then submit the receipt so it can be matched to your rent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Bank</span>
                  <span className="text-neutral-900">{home.bankAccount.bank_name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Account name</span>
                  <span className="text-neutral-900">{home.bankAccount.account_name}</span>
                </div>
                {home.bankAccount.iban && <CopyableReference label="IBAN" value={home.bankAccount.iban} />}
                {home.paymentReference && (
                  <CopyableReference label="Payment reference" value={home.paymentReference} />
                )}
              </div>
              <div className="flex items-end justify-end">
                <SubmitPaymentProofDialog
                  leaseId={home.lease.id}
                  amountDue={home.nextInstalment?.outstanding_amount ?? 0}
                  reference={home.paymentReference}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Rent schedule</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          {schedule.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No rent schedule" description="Your instalments will appear here once the lease is active." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {(schedule as ScheduleRow[]).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="tabular-nums text-neutral-500">{i.instalment_number}</TableCell>
                    <TableCell className="text-neutral-800">{formatDate(i.due_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(i.original_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.outstanding_amount > 0 ? formatCurrency(i.outstanding_amount) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <EmptyState icon={Receipt} title="No payments yet" description="Payments you submit or that we record appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {(payments as PaymentRow[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-neutral-600">{formatDate(p.paid_at)}</TableCell>
                    <TableCell className="capitalize text-neutral-600">{p.method.replace(/_/g, " ")}</TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{p.reference ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                      {p.rejected_reason && (
                        <p className="mt-1 text-xs text-red-700">{p.rejected_reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{p.receipt_number ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="mb-4 flex justify-end">
            <NewMaintenanceRequestDialog units={units} categories={categories ?? []} />
          </div>
          {maintenance.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance requests"
              description="Report anything that needs fixing and you can follow its progress here."
              action={<NewMaintenanceRequestDialog units={units} categories={categories ?? []} />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Latest update</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {(maintenance as MaintenanceRow[]).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums font-medium text-neutral-900">{m.request_code}</TableCell>
                    <TableCell className="text-neutral-600">
                      {m.category_name ? `${m.category_name}: ` : ""}
                      {m.description}
                    </TableCell>
                    <TableCell className="text-neutral-600">{formatDate(m.created_at)}</TableCell>
                    <TableCell className="text-neutral-600">{m.latestUpdate ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Your lease and other paperwork will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {(documents as DocumentRow[]).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-neutral-900">{d.title}</TableCell>
                    <TableCell className="capitalize text-neutral-600">{String(d.category).replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-neutral-600">{formatDate(d.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {!home.lease && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-400">
          <Home className="h-3 w-3" />
          No active lease is linked to your account yet.
        </p>
      )}
    </PortalLayout>
  );
}
