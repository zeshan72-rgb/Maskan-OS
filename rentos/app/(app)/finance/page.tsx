import { Banknote, FileSpreadsheet, Receipt, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { getFinanceOverview, listOwnerStatements } from "@/features/finance/queries";
import { getPropertyOptions, getOwnerOptions } from "@/features/properties/queries";
import { getVendorOptions } from "@/features/maintenance/queries";
import {
  RecordExpenseDialog,
  ExpenseApprovalActions,
  GenerateStatementDialog,
  FinaliseStatementButton,
} from "@/features/finance/components/finance-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function FinancePage() {
  const { ctx, membership } = await requireStaff();
  const canManageExpenses = hasPermission(ctx, membership.organisationId, "finance.expenses.manage");
  const canManageStatements = hasPermission(ctx, membership.organisationId, "finance.statements.manage");

  const supabase = await createClient();
  const [overview, statements, { data: expenses }, { data: categories }, properties, owners, vendors] =
    await Promise.all([
      getFinanceOverview(membership.organisationId),
      listOwnerStatements(membership.organisationId),
      supabase
        .from("property_expenses")
        .select("id, description, amount, expense_date, approval_status, properties ( id, name ), vendors ( name ), expense_categories ( name )")
        .eq("organisation_id", membership.organisationId)
        .order("expense_date", { ascending: false })
        .limit(100),
      supabase.from("expense_categories").select("id, name").is("organisation_id", null).order("name"),
      getPropertyOptions(membership.organisationId),
      getOwnerOptions(membership.organisationId),
      getVendorOptions(membership.organisationId),
    ]);

  const expenseRows = expenses ?? [];
  const pendingExpenses = expenseRows.filter((e) => e.approval_status === "pending");

  return (
    <>
      <PageHeader
        title="Finance"
        description="Collection, expenses, management fees and what is owed to each owner."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageExpenses && (
              <RecordExpenseDialog properties={properties} categories={categories ?? []} vendors={vendors} />
            )}
            {canManageStatements && <GenerateStatementDialog owners={owners} />}
          </div>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Received this month"
          value={formatCurrency(overview.receivedThisMonth)}
          icon={Banknote}
          tone="success"
          progress={
            overview.expectedThisMonth > 0
              ? Math.round((overview.receivedThisMonth / overview.expectedThisMonth) * 100)
              : 0
          }
          sublabel={`of ${formatCurrency(overview.expectedThisMonth)} due`}
        />
        <StatCard
          label="Total arrears"
          value={formatCurrency(overview.totalArrears)}
          tone={overview.totalArrears > 0 ? "danger" : "success"}
          sublabel={`${formatCurrency(overview.outstandingThisMonth)} from this month`}
        />
        <StatCard
          label="Expenses this month"
          value={formatCurrency(overview.expensesThisMonth)}
          icon={Receipt}
          sublabel={`${formatCurrency(overview.managementFeesThisMonth)} in management fees`}
        />
        <StatCard
          label="Payable to owners"
          value={formatCurrency(overview.ownerPayable)}
          icon={Wallet}
          tone="info"
          sublabel="Net of fees and expenses"
        />
      </div>

      {(overview.pendingVerification > 0 || overview.chequesDueSoon > 0) && (
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          {overview.pendingVerification > 0 && (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              {overview.pendingVerification} payment{overview.pendingVerification === 1 ? "" : "s"} awaiting verification
            </span>
          )}
          {overview.chequesDueSoon > 0 && (
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
              {overview.chequesDueSoon} cheque{overview.chequesDueSoon === 1 ? "" : "s"} due within 30 days
            </span>
          )}
        </div>
      )}

      <Tabs defaultValue={pendingExpenses.length > 0 ? "expenses" : "statements"}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses ({expenseRows.length})</TabsTrigger>
          <TabsTrigger value="statements">Owner statements ({statements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          {expenseRows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Record what has been spent on a property. Approved expenses appear on the owner's statement."
              action={
                canManageExpenses ? (
                  <RecordExpenseDialog properties={properties} categories={categories ?? []} vendors={vendors} />
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {expenseRows.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-neutral-600">{formatDate(expense.expense_date)}</TableCell>
                    <TableCell className="text-neutral-800">{one(expense.properties)?.name ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{expense.description ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{one(expense.expense_categories)?.name ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{one(expense.vendors)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell><StatusBadge status={expense.approval_status} /></TableCell>
                    <TableCell className="text-right">
                      {canManageExpenses && expense.approval_status === "pending" && (
                        <ExpenseApprovalActions expenseId={expense.id} />
                      )}
                    </TableCell>
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
              title="No statements generated"
              description="Generate a statement for an owner over a period. Finalising it locks the figures."
              action={canManageStatements ? <GenerateStatementDialog owners={owners} /> : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right">Closing balance</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium text-neutral-900">{statement.owner_name}</TableCell>
                    <TableCell className="text-neutral-600">
                      {formatDate(statement.period_start)} → {formatDate(statement.period_end)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(statement.owner_payout)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(statement.closing_balance)}</TableCell>
                    <TableCell className="tabular-nums text-neutral-500">v{statement.version}</TableCell>
                    <TableCell><StatusBadge status={statement.status} /></TableCell>
                    <TableCell className="text-right">
                      {canManageStatements && statement.status === "draft" && (
                        <FinaliseStatementButton statementId={statement.id} />
                      )}
                    </TableCell>
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
