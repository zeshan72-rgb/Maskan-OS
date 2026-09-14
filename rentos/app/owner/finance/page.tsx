import { AlertCircle, Banknote, Receipt, Wallet } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { getOwnerPortalSummary, getOwnerFinancials } from "@/features/portals/owner-queries";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OwnerFinancePage() {
  const { membership, ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const [summary, transactions] = await Promise.all([
    getOwnerPortalSummary(membership.organisationId, ownerId),
    getOwnerFinancials(ownerId),
  ]);

  const t = summary.totals;

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Money in and out</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Rent collected on your behalf, what it cost to run, and what is left for you.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rent received" value={formatCurrency(t.rentReceived)} icon={Banknote} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(t.outstanding)}
          tone={t.outstanding > 0 ? "warning" : "success"} sublabel="Still to collect" />
        <StatCard label="Costs" value={formatCurrency(t.expenses + t.managementFees)} icon={Receipt}
          sublabel={`includes ${formatCurrency(t.managementFees)} management fee`} />
        <StatCard label="Net to you" value={formatCurrency(t.netToOwner)} icon={Wallet} tone="info" />
      </div>

      {/* The arithmetic, stated plainly. An owner statement that only shows
          a final number invites the question this answers. */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">How the figure is reached</h2>
        <dl className="space-y-1.5 text-sm">
          {[
            ["Rent received", t.rentReceived, "plus"],
            ["Costs and maintenance", -t.expenses, "less"],
            ["Management fee", -t.managementFees, "less"],
          ].map(([label, amount]) => (
            <div key={label as string} className="flex justify-between gap-4">
              <dt className="text-neutral-500">{label}</dt>
              <dd className={`tabular-nums ${(amount as number) < 0 ? "text-red-700" : "text-neutral-900"}`}>
                {(amount as number) < 0 ? "−" : ""}{formatCurrency(Math.abs(amount as number))}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 font-semibold">
            <dt className="text-neutral-900">Net to you</dt>
            <dd className="tabular-nums text-neutral-900">{formatCurrency(t.netToOwner)}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mb-3 text-base">Transactions</h2>
      {transactions.length === 0 ? (
        <EmptyState icon={Banknote} title="No transactions yet"
          description="Rent, expenses and payouts appear here as they happen." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Property</TableHead>
              <TableHead>Note</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {transactions.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="text-neutral-600">{formatDate(x.transaction_date)}</TableCell>
                <TableCell className="capitalize text-neutral-800">{x.transaction_type.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-neutral-600">{x.property_name ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{x.notes ?? "—"}</TableCell>
                <TableCell className={`text-right tabular-nums ${x.amount < 0 ? "text-red-700" : "text-neutral-900"}`}>
                  {formatCurrency(x.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PortalLayout>
  );
}
