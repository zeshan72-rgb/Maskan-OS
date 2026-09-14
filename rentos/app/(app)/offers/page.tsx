import Link from "next/link";
import { FileSignature } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_OFFERS_LIST } from "@/features/leasing/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** TODO: stub data. See features/leasing/stub-data.ts. */
export default async function OffersPage() {
  await requireStaff();
  const offers = STUB_OFFERS_LIST;
  const count = (s: string) => offers.filter((o) => o.status === s).length;

  return (
    <>
      <PageHeader
        title="Offers"
        description="What has been put to each owner, and what came back."
        actions={<Link href="/offers/builder"><Button size="sm">Build an offer</Button></Link>}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="With the owner" value={count("with_owner")} icon={FileSignature} tone="warning"
          sublabel="Awaiting a decision" />
        <StatCard label="Countered" value={count("countered")} tone="info" />
        <StatCard label="Accepted" value={count("accepted")} tone="success" />
        <StatCard label="Declined" value={count("declined")} tone={count("declined") ? "danger" : "default"} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Offer</TableHead><TableHead>Unit</TableHead><TableHead>Client</TableHead>
            <TableHead>Agent</TableHead><TableHead className="text-right">Asking</TableHead>
            <TableHead className="text-right">Offered</TableHead><TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="stagger">
          {offers.map((o) => {
            const gap = o.offered - o.asking;
            const days = daysUntil(o.expiresOn);
            return (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-neutral-900">{o.code}</TableCell>
                <TableCell className="text-neutral-600">
                  {o.unit}
                  <p className="text-xs text-neutral-400">{o.property}</p>
                </TableCell>
                <TableCell className="text-neutral-600">{o.client}</TableCell>
                <TableCell className="text-neutral-600">{o.agent}</TableCell>
                <TableCell className="text-right tabular-nums text-neutral-600">{formatCurrency(o.asking)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(o.offered)}
                  {gap !== 0 && (
                    <span className={`ml-1.5 text-xs ${gap < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {gap > 0 ? "+" : ""}{formatCurrency(gap)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {formatDate(o.expiresOn)}
                  {o.status === "with_owner" && days >= 0 && (
                    <span className="ml-1.5 text-xs text-amber-700">{days}d</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="mt-4 text-xs text-neutral-400">Sample data. See features/leasing/stub-data.ts.</p>
    </>
  );
}
