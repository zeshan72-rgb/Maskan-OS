import { Lock, LockOpen, Scale } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_OPENING_BALANCES } from "@/features/finance/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** TODO: stub data. See features/finance/stub-data.ts. */
export default async function OpeningBalancesPage() {
  await requireStaff();
  const rows = STUB_OPENING_BALANCES;

  const owedToUs = rows.filter((r) => r.direction === "owed_to_us").reduce((s, r) => s + r.amount, 0);
  const owedByUs = rows.filter((r) => r.direction === "owed_by_us").reduce((s, r) => s + r.amount, 0);
  const unlocked = rows.filter((r) => !r.locked);

  return (
    <>
      <PageHeader
        title="Opening balances"
        description="What each tenant and owner owed on the day the system took over. The line between what we were told and what we have recorded ourselves."
        actions={
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            Sample data
          </span>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Entries" value={rows.length} icon={Scale} />
        <StatCard label="Owed to us" value={formatCurrency(owedToUs)} tone={owedToUs > 0 ? "warning" : "success"}
          sublabel="Tenant arrears carried in" />
        <StatCard label="Owed by us" value={formatCurrency(owedByUs)} tone="info"
          sublabel="Owner funds carried in" />
        <StatCard label="Not yet locked" value={unlocked.length}
          tone={unlocked.length > 0 ? "danger" : "success"} sublabel="Still editable" />
      </div>

      {unlocked.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{unlocked.length} entr{unlocked.length === 1 ? "y is" : "ies are"} unlocked.</strong>{" "}
          An opening balance should be locked once both sides agree it. Editing one afterwards
          silently rewrites history that predates this system, and nothing in the ledger will
          show that it changed.
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead><TableHead>Reference</TableHead><TableHead>As at</TableHead>
            <TableHead className="text-right">Amount</TableHead><TableHead>Direction</TableHead>
            <TableHead>Source</TableHead><TableHead>State</TableHead><TableHead />
          </TableRow>
        </TableHeader>
        <TableBody className="stagger">
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <span className="font-medium text-neutral-900">{r.subject}</span>
                <p className="text-xs text-neutral-500">{r.note}</p>
              </TableCell>
              <TableCell className="tabular-nums text-neutral-600">{r.reference}</TableCell>
              <TableCell className="text-neutral-600">{formatDate(r.asAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(r.amount)}</TableCell>
              <TableCell>
                <Badge variant={r.direction === "owed_to_us" ? "warning" : "info"}>
                  {r.direction === "owed_to_us" ? "Owed to us" : "Owed by us"}
                </Badge>
              </TableCell>
              <TableCell className="text-neutral-600">{r.source}</TableCell>
              <TableCell>
                {r.locked ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                    <LockOpen className="h-3 w-3" /> Open
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!r.locked && <Button variant="outline" size="sm">Agree and lock</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-4 text-xs text-neutral-400">
        Sample data. There is no opening_balances table yet; see
        features/finance/stub-data.ts for the migration this needs.
      </p>
    </>
  );
}
