import { Receipt } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { listExpenses } from "@/features/finance/queries";
import { getPropertyOptions } from "@/features/properties/queries";
import { getVendorOptions } from "@/features/maintenance/queries";
import { RecordExpenseDialog, ExpenseApprovalActions } from "@/features/finance/components/finance-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "finance.expenses.manage");

  const supabase = await createClient();
  const [{ rows, total }, properties, vendors, { data: categories }] = await Promise.all([
    listExpenses({ organisationId: membership.organisationId, status, q }),
    getPropertyOptions(membership.organisationId),
    getVendorOptions(membership.organisationId),
    supabase.from("expense_categories").select(
      "id, name"
    ).is("organisation_id", null).order("name"),
  ]);

  const pending = rows.filter((e) => e.approval_status === "pending");
  const approvedValue = rows.filter((e) => e.approval_status === "approved")
    .reduce((s, e) => s + Number(e.amount), 0);

  const dialog = canManage
    ? <RecordExpenseDialog properties={properties} categories={categories ?? []} vendors={vendors} />
    : undefined;

  return (
    <>
      <PageHeader
        title="Expenses"
        description="What has been spent on each property. Approved expenses land on the owner's statement."
        actions={dialog}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Recorded" value={total} icon={Receipt} />
        <StatCard label="Awaiting approval" value={pending.length}
          tone={pending.length > 0 ? "warning" : "success"} />
        <StatCard label="Approved value" value={formatCurrency(approvedValue)} tone="success"
          sublabel="Recharged to owners" />
        <StatCard label="Pending value"
          value={formatCurrency(pending.reduce((s, e) => s + Number(e.amount), 0))} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={status || q ? "Nothing matches" : "No expenses recorded"}
          description={
            status || q
              ? "Clear the filter to see everything."
              : "Record what has been spent against a property so it can be approved and recharged."
          }
          action={!status && !q ? dialog : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Property</TableHead><TableHead>Description</TableHead>
              <TableHead>Category</TableHead><TableHead>Vendor</TableHead><TableHead>Owner</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-neutral-600">{formatDate(e.expense_date)}</TableCell>
                <TableCell className="text-neutral-800">{e.property_name}</TableCell>
                <TableCell className="text-neutral-600">{e.description ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{e.category_name ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{e.vendor_name ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{e.owner_name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(e.amount)}</TableCell>
                <TableCell><StatusBadge status={e.approval_status} /></TableCell>
                <TableCell className="text-right">
                  {canManage && e.approval_status === "pending" && <ExpenseApprovalActions expenseId={e.id} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
