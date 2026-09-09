import { BarChart3 } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import {
  getPortfolioReport,
  getCollectionReport,
  getLeaseExpiryReport,
  getChequeReport,
  getVendorPerformanceReport,
  getMaintenanceReport,
} from "@/features/reports/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { membership } = await requireStaff();
  const orgId = membership.organisationId;

  const [portfolio, collection, expiries, cheques, vendors, maintenance] = await Promise.all([
    getPortfolioReport(orgId),
    getCollectionReport(orgId),
    getLeaseExpiryReport(orgId),
    getChequeReport(orgId),
    getVendorPerformanceReport(orgId),
    getMaintenanceReport(orgId),
  ]);

  const empty = (title: string, description: string) => (
    <EmptyState icon={BarChart3} title={title} description={description} />
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Every figure is read from the live database at request time. Nothing here is cached or estimated."
      />

      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="expiries">Lease expiries</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          {portfolio.properties.length === 0 ? (
            empty("No properties", "Add a property to see the portfolio breakdown.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Occupied</TableHead>
                  <TableHead className="text-right">Vacant</TableHead>
                  <TableHead className="text-right">Monthly rent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {portfolio.properties.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium text-neutral-900">{row.name}</TableCell>
                    <TableCell className="capitalize text-neutral-600">{row.type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{row.occupied}</TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-500">{row.vacant}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.monthlyRent)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-neutral-200 font-semibold">
                  <TableCell className="text-neutral-900">Total</TableCell>
                  <TableCell className="text-neutral-500">{portfolio.totals.properties} properties</TableCell>
                  <TableCell className="text-right tabular-nums">{portfolio.totals.units}</TableCell>
                  <TableCell className="text-right tabular-nums">{portfolio.totals.occupied}</TableCell>
                  <TableCell className="text-right tabular-nums">{portfolio.totals.vacant}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(portfolio.totals.monthlyRent)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="collection">
          {collection.length === 0 ? (
            empty("No rent history", "Collection appears once leases are activated and instalments fall due.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {collection.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="text-neutral-800">{row.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.expected)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{formatCurrency(row.collected)}</TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{formatCurrency(row.outstanding)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={row.rate >= 95 ? "text-emerald-700" : row.rate >= 80 ? "text-amber-700" : "text-red-700"}>
                        {row.rate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="expiries">
          {expiries.length === 0 ? (
            empty("Nothing expiring", "No leases end within the next 120 days.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / unit</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Days left</TableHead>
                  <TableHead className="text-right">Monthly rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {expiries.map((row) => (
                  <TableRow key={row.lease_code}>
                    <TableCell className="font-medium text-neutral-900">{row.lease_code}</TableCell>
                    <TableCell className="text-neutral-600">{row.tenant_name}</TableCell>
                    <TableCell className="text-neutral-600">
                      {row.property_name} · {row.unit_number}
                    </TableCell>
                    <TableCell className="text-neutral-600">{formatDate(row.end_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={row.daysRemaining <= 30 ? "text-red-700" : row.daysRemaining <= 60 ? "text-amber-700" : "text-neutral-700"}>
                        {row.daysRemaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.monthly_rent)}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="cheques">
          {cheques.length === 0 ? (
            empty("No cheques on record", "Cheques added against leases are summarised here by status.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {cheques.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="vendors">
          {vendors.length === 0 ? (
            empty("No vendor activity", "Assign work orders to vendors and their performance appears here.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Completion rate</TableHead>
                  <TableHead className="text-right">Total cost</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {vendors.map((row) => (
                  <TableRow key={row.vendor_name}>
                    <TableCell className="font-medium text-neutral-900">{row.vendor_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.completionRate}%</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.totalCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.avgCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          {maintenance.length === 0 ? (
            empty("No maintenance history", "Requests are grouped by category once they are raised.")
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Average age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {maintenance.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium text-neutral-900">{row.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-700">{row.open}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{row.completed}</TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{row.avgAgeDays} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
