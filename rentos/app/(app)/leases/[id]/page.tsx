import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, CalendarClock, Home, Receipt, User } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { getLease, getOutstandingInstalments } from "@/features/leases/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeaseActions } from "@/features/leases/components/lease-actions";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { PAYMENT_FREQUENCIES, PAYMENT_METHODS } from "@/lib/validation/leases";

export const dynamic = "force-dynamic";

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, membership } = await requireStaff();

  const lease = await getLease(membership.organisationId, id);
  if (!lease) notFound();

  const canManageLease = hasPermission(ctx, membership.organisationId, "leases.manage");
  const canManagePayments = hasPermission(ctx, membership.organisationId, "payments.manage");
  const outstandingInstalments = canManagePayments
    ? await getOutstandingInstalments(membership.organisationId, id)
    : [];

  const collectionPct = lease.totals.billed > 0
    ? Math.round((lease.totals.collected / lease.totals.billed) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={lease.lease_code}
        description={[
          lease.property?.name,
          lease.unit ? `Unit ${lease.unit.unit_number}` : null,
          lease.tenant?.name,
        ].filter(Boolean).join(" · ")}
        breadcrumbs={[{ label: "Leases", href: "/leases" }, { label: lease.lease_code }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lease.status} />
            {canManagePayments && lease.hasSchedule && (
              <RecordPaymentDialog leaseId={lease.id} instalments={outstandingInstalments} />
            )}
            <LeaseActions
              leaseId={lease.id}
              status={lease.status}
              monthlyRent={lease.monthly_rent}
              endDate={lease.end_date}
              canManage={canManageLease}
            />
          </div>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly rent" value={formatCurrency(lease.monthly_rent)} icon={Banknote} />
        <StatCard label="Billed to date" value={formatCurrency(lease.totals.billed)} icon={Receipt} sublabel={`${lease.instalments.length} instalments`} />
        <StatCard
          label="Collected"
          value={formatCurrency(lease.totals.collected)}
          tone="success"
          progress={collectionPct}
          sublabel={`${collectionPct}% of billed`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(lease.totals.outstanding)}
          tone={lease.totals.overdue > 0 ? "danger" : lease.totals.outstanding > 0 ? "warning" : "success"}
          sublabel={lease.totals.overdue > 0 ? `${formatCurrency(lease.totals.overdue)} overdue` : "Nothing overdue"}
        />
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Rent schedule</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          {!lease.hasSchedule ? (
            <EmptyState
              icon={CalendarClock}
              title="No rent schedule yet"
              description={
                ["draft", "pending"].includes(lease.status)
                  ? "Activating this lease generates the instalment schedule from its payment frequency."
                  : "This lease has no instalments recorded."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payments applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lease.instalments.map((instalment) => (
                  <TableRow key={instalment.id}>
                    <TableCell className="tabular-nums text-neutral-500">{instalment.instalment_number}</TableCell>
                    <TableCell className="text-neutral-800">{formatDate(instalment.due_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(instalment.original_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {instalment.outstanding_amount > 0 ? formatCurrency(instalment.outstanding_amount) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={instalment.status} /></TableCell>
                    <TableCell>
                      {instalment.allocations.length === 0 ? (
                        <span className="text-xs text-neutral-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {instalment.allocations.map((allocation, i) => (
                            <Badge key={`${allocation.payment_id}-${i}`} variant="outline">
                              {formatCurrency(allocation.amount)}
                              {allocation.reference ? ` · ${allocation.reference}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="terms">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Tenancy</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  {[
                    ["Property", lease.property?.name ?? "—", lease.property ? `/properties/${lease.property.id}` : null],
                    ["Unit", lease.unit?.unit_number ?? "—", null],
                    ["Tenant", lease.tenant?.name ?? "—", lease.tenant ? `/tenants/${lease.tenant.id}` : null],
                    ["Owner", lease.owner?.name ?? "—", lease.owner ? `/owners/${lease.owner.id}` : null],
                    ["Start date", formatDate(lease.start_date), null],
                    ["End date", formatDate(lease.end_date), null],
                    ["Grace period", `${lease.grace_period_days} days`, null],
                  ].map(([label, value, href]) => (
                    <div key={label as string} className="flex items-center justify-between py-2">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="font-medium text-neutral-900">
                        {href ? (
                          <Link href={href as string} className="hover:underline">{value}</Link>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financial terms</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  {[
                    ["Monthly rent", formatCurrency(lease.monthly_rent)],
                    ["Total contract rent", formatCurrency(lease.total_contract_rent)],
                    ["Security deposit", formatCurrency(lease.security_deposit)],
                    ["Frequency", PAYMENT_FREQUENCIES.find((f) => f.value === lease.payment_frequency)?.label ?? lease.payment_frequency],
                    ["Method", PAYMENT_METHODS.find((m) => m.value === lease.payment_method)?.label ?? lease.payment_method],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="font-medium tabular-nums text-neutral-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                {lease.notes && (
                  <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">{lease.notes}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="renewals">
          {lease.renewalOffers.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No renewal offers"
              description="When the lease nears its end date, offer a renewal here. Accepting it creates the successor lease automatically."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offered</TableHead>
                  <TableHead>New term</TableHead>
                  <TableHead className="text-right">New rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lease.renewalOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="text-neutral-600">{formatDate(offer.created_at)}</TableCell>
                    <TableCell className="text-neutral-800">
                      {formatDate(offer.new_start_date)} → {formatDate(offer.new_end_date)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(offer.new_monthly_rent)}</TableCell>
                    <TableCell><StatusBadge status={offer.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="history">
          {lease.events.length === 0 ? (
            <EmptyState icon={User} title="No events recorded" description="Lease lifecycle events appear here as they happen." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Lease timeline</CardTitle>
                <CardDescription>Every status change, in order.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
                  {lease.events.map((event) => (
                    <li key={event.id} className="animate-[fade-in_0.3s_ease-out]">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-400" />
                      <p className="text-sm font-medium capitalize text-neutral-900">
                        {event.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-neutral-500">{formatDateTime(event.created_at)}</p>
                      {event.notes && <p className="mt-0.5 text-sm text-neutral-600">{event.notes}</p>}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {lease.unit && (
        <p className="mt-6 text-xs text-neutral-400">
          <Home className="mr-1 inline h-3 w-3" />
          Unit occupancy is derived from this lease — it updates automatically on activation and termination.
        </p>
      )}
    </>
  );
}
