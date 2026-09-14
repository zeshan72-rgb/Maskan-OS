import { FileSpreadsheet } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { listOwnerStatements } from "@/features/finance/queries";
import { getOwnerOptions } from "@/features/properties/queries";
import { GenerateStatementDialog, FinaliseStatementButton } from "@/features/finance/components/finance-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Owner statements. Each is a period's rent received less expenses,
 * maintenance and the management fee, leaving what is payable to the owner.
 * Finalising locks the figures and bumps the version, so a reissue is a new
 * version rather than a silent edit.
 */
export default async function StatementsPage() {
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "finance.statements.manage");

  const [statements, owners] = await Promise.all([
    listOwnerStatements(membership.organisationId),
    canManage ? getOwnerOptions(membership.organisationId) : Promise.resolve([]),
  ]);

  const drafts = statements.filter((s) => s.status === "draft");
  const payable = statements.filter((s) => s.status !== "draft")
    .reduce((sum, s) => sum + Number(s.owner_payout), 0);
  const dialog = canManage ? <GenerateStatementDialog owners={owners} /> : undefined;

  // listOwnerStatements returns the headline figures only. The full
  // breakdown — rent received, expenses, maintenance, fees — lives in
  // owner_statements and owner_statement_items; a statement detail page in
  // slice 1c will read those.
  return (
    <>
      <PageHeader
        title="Owner statements"
        description="What each owner is owed for a period, after fees and expenses."
        actions={dialog}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Statements" value={statements.length} icon={FileSpreadsheet} />
        <StatCard label="In draft" value={drafts.length}
          tone={drafts.length > 0 ? "warning" : "default"} sublabel="Not yet finalised" />
        <StatCard label="Finalised payouts" value={formatCurrency(payable)} tone="success" />
        <StatCard label="Owners covered"
          value={new Set(statements.map((s) => s.owner_name)).size} />
      </div>

      {statements.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No statements yet"
          description="Generate one for an owner over a period. Finalising locks the figures."
          action={dialog}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead><TableHead>Period</TableHead>
              <TableHead className="text-right">Payable to owner</TableHead>
              <TableHead className="text-right">Closing balance</TableHead>
              <TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {statements.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-neutral-900">{s.owner_name}</TableCell>
                <TableCell className="text-neutral-600">
                  {formatDate(s.period_start)} → {formatDate(s.period_end)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(s.owner_payout)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-neutral-600">
                  {formatCurrency(s.closing_balance)}
                </TableCell>
                <TableCell className="tabular-nums text-neutral-500">v{s.version}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-right">
                  {canManage && s.status === "draft" && <FinaliseStatementButton statementId={s.id} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
