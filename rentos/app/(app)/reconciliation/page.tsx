import { AlertTriangle, CheckCircle2, Landmark, Scale } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_BANK_LINES, STUB_RECONCILIATION, reconciliationTotals } from "@/features/finance/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const STATE_LABEL = { matched: "Matched", unmatched: "Unmatched", suggested: "Suggested", ignored: "Ignored" } as const;
const STATE_TONE = { matched: "success", unmatched: "danger", suggested: "warning", ignored: "neutral" } as const;

/** TODO: stub data. See features/finance/stub-data.ts. */
export default async function ReconciliationPage() {
  await requireStaff();
  const r = STUB_RECONCILIATION;
  const t = reconciliationTotals();

  return (
    <>
      <PageHeader
        title="Bank reconciliation"
        description={`${r.bankAccount} · ${formatDate(r.periodStart)} to ${formatDate(r.periodEnd)}`}
        actions={
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            Sample data
          </span>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Statement in" value={formatCurrency(t.statementIn)} icon={Landmark} tone="success" />
        <StatCard label="Statement out" value={formatCurrency(t.statementOut)} />
        <StatCard label="Matched" value={`${t.matched} of ${STUB_BANK_LINES.length}`} icon={CheckCircle2}
          progress={Math.round((t.matched / STUB_BANK_LINES.length) * 100)} />
        <StatCard label="Variance" value={formatCurrency(Math.abs(t.variance))} icon={Scale}
          tone={t.variance === 0 ? "success" : "danger"}
          sublabel={t.variance === 0 ? "Statement agrees with the ledger" : "Statement and ledger disagree"} />
      </div>

      {/* The session cannot close on a variance. Closing anyway is how a
          discrepancy becomes permanent. */}
      <Card className={`mb-5 ${t.canClose ? "" : "border-red-200 bg-red-50"}`}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-2.5">
            {t.canClose
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
            <div>
              <p className={`text-sm font-medium ${t.canClose ? "text-neutral-900" : "text-red-900"}`}>
                {t.canClose ? "Ready to close" : "Cannot close this period"}
              </p>
              <p className={`text-sm ${t.canClose ? "text-neutral-600" : "text-red-800"}`}>
                {t.canClose
                  ? "Every line is accounted for and the statement agrees with the ledger."
                  : `${t.unmatched} line${t.unmatched === 1 ? "" : "s"} unmatched and a variance of ${formatCurrency(Math.abs(t.variance))}. Both must be nil before the period can be closed.`}
              </p>
            </div>
          </div>
          <Button disabled={!t.canClose} size="sm">Close the period</Button>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Statement balance</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Opening</span><span className="tabular-nums">{formatCurrency(r.openingStatementBalance)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Closing</span><span className="tabular-nums">{formatCurrency(r.closingStatementBalance)}</span></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Ledger movement</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Received</span><span className="tabular-nums text-emerald-700">{formatCurrency(r.ledgerIn)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Paid out</span><span className="tabular-nums text-red-700">−{formatCurrency(r.ledgerOut)}</span></div>
          </div>
        </CardContent></Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Value date</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead><TableHead>Matched to</TableHead>
            <TableHead>State</TableHead><TableHead />
          </TableRow>
        </TableHeader>
        <TableBody className="stagger">
          {STUB_BANK_LINES.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-neutral-600">{formatDate(l.valueDate)}</TableCell>
              <TableCell className="text-neutral-800">{l.description}</TableCell>
              <TableCell className="tabular-nums text-neutral-600">{l.reference ?? "—"}</TableCell>
              <TableCell className={`text-right tabular-nums ${l.direction === "out" ? "text-red-700" : "text-neutral-900"}`}>
                {l.direction === "out" ? "−" : ""}{formatCurrency(l.amount)}
              </TableCell>
              <TableCell className="text-neutral-600">
                {l.matchedTo ?? (l.suggestion ? <span className="text-amber-700">{l.suggestion}</span> : "—")}
              </TableCell>
              <TableCell><Badge variant={STATE_TONE[l.state]}>{STATE_LABEL[l.state]}</Badge></TableCell>
              <TableCell className="text-right">
                {l.state === "unmatched" && <Button variant="outline" size="sm">Match</Button>}
                {l.state === "suggested" && <Button size="sm">Accept</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-4 text-xs text-neutral-400">
        Sample data. There is no bank_transactions or reconciliation_sessions table yet;
        see features/finance/stub-data.ts for the migration this needs.
      </p>
    </>
  );
}
