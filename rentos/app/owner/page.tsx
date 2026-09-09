import { AlertCircle, Banknote, Building2, FileSpreadsheet, Home, Wrench } from "lucide-react";
import { requireRole } from "@/lib/permissions/guards";
import {
  getOwnerPortalSummary,
  getOwnerStatements,
  getOwnerMaintenance,
  getOwnerFinancials,
} from "@/features/portals/owner-queries";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OwnerPortalPage() {
  const { membership } = await requireRole("property_owner");
  const ownerId = membership.ownerId;

  if (!ownerId) {
    return (
      <PortalLayout title="Owner">
        <EmptyState
          icon={AlertCircle}
          title="Your account is not linked to an owner record"
          description="The owner role is set, but no owner record is attached. An administrator needs to link it."
        />
      </PortalLayout>
    );
  }

  const [summary, statements, maintenance, financials] = await Promise.all([
    getOwnerPortalSummary(membership.organisationId, ownerId),
    getOwnerStatements(membership.organisationId, ownerId),
    getOwnerMaintenance(ownerId),
    getOwnerFinancials(ownerId),
  ]);

  const occupancyPct =
    summary.totals.units > 0 ? Math.round((summary.totals.occupied / summary.totals.units) * 100) : 0;

  return (
    <PortalLayout title="Owner">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{summary.ownerName}</h1>
        <p className="text-sm text-neutral-500">
          {summary.totals.properties} propert{summary.totals.properties === 1 ? "y" : "ies"} ·{" "}
          {summary.totals.units} unit{summary.totals.units === 1 ? "" : "s"} under management
        </p>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          icon={Home}
          progress={occupancyPct}
          sublabel={`${summary.totals.occupied} let, ${summary.totals.vacant} vacant`}
        />
        <StatCard
          label="Rent received"
          value={formatCurrency(summary.totals.rentReceived)}
          icon={Banknote}
          tone="success"
          sublabel={
            summary.totals.outstanding > 0
              ? `${formatCurrency(summary.totals.outstanding)} outstanding`
              : "Nothing outstanding"
          }
        />
        <StatCard
          label="Costs"
          value={formatCurrency(summary.totals.expenses + summary.totals.managementFees)}
          sublabel={`${formatCurrency(summary.totals.managementFees)} management fees`}
        />
        <StatCard
          label="Net to you"
          value={formatCurrency(summary.totals.netToOwner)}
          tone="info"
          sublabel="After fees and expenses"
        />
      </div>

      <Tabs defaultValue="properties">
        <TabsList>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="financials">Transactions</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({summary.openMaintenance})</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          {summary.properties.length === 0 ? (
            <EmptyState icon={Building2} title="No properties" description="Nothing is registered against your name yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Occupied</TableHead>
                  <TableHead className="text-right">Vacant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {summary.properties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-neutral-900">{p.name}</TableCell>
                    <TableCell className="text-neutral-600">{p.address ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{p.occupied}</TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-500">{p.units - p.occupied}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="statements">
          {statements.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No statements yet"
              description="Once a statement is finalised for a period, it appears here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Rent received</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Paid to you</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {statements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-neutral-800">
                      {formatDate(s.period_start)} to {formatDate(s.period_end)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.rent_received)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.expenses + s.maintenance_costs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.management_fees)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(s.owner_payout)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="financials">
          {financials.length === 0 ? (
            <EmptyState icon={Banknote} title="No transactions" description="Rent, expenses and payouts appear here as they happen." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {financials.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-neutral-600">{formatDate(t.transaction_date)}</TableCell>
                    <TableCell className="capitalize text-neutral-800">{t.transaction_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-neutral-600">{t.property_name ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{t.notes ?? "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums ${t.amount < 0 ? "text-red-700" : "text-neutral-900"}`}>
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          {maintenance.length === 0 ? (
            <EmptyState icon={Wrench} title="Nothing open" description="No maintenance is outstanding on your properties." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Property / unit</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {maintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums font-medium text-neutral-900">{m.request_code}</TableCell>
                    <TableCell className="text-neutral-600">{m.property_name} · {m.unit_number}</TableCell>
                    <TableCell className="text-neutral-600">{m.description}</TableCell>
                    <TableCell className="text-neutral-600">{formatDate(m.created_at)}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
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
