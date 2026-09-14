import Link from "next/link";
import { BookOpen, Banknote } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
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

/**
 * The allocation ledger: what is owed, what arrived, and which one settled
 * the other. Rent owed and money received are separate records joined by an
 * allocation, which is the only way to express a part payment without
 * marking an instalment paid.
 */
export default async function LedgerPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  const [{ data: instalments }, { data: allocations }] = await Promise.all([
    supabase
      .from("rent_instalments")
      .select("id, instalment_number, due_date, original_amount, outstanding_amount, status, leases ( id, lease_code, tenants ( name ) )")
      .eq("organisation_id", membership.organisationId)
      .order("due_date", { ascending: false })
      .limit(150),
    supabase
      .from("payment_allocations")
      .select("id, amount, created_at, payments ( id, reference, method, paid_at, status, tenants ( name ) ), rent_instalments ( instalment_number, due_date, leases ( lease_code ) )")
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const inst = instalments ?? [];
  const alloc = allocations ?? [];
  const billed = inst.reduce((s, i) => s + Number(i.original_amount), 0);
  const outstanding = inst.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const settled = billed - outstanding;

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Every instalment and every allocation against it. A payment does not settle an instalment until it is allocated."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Billed" value={formatCurrency(billed)} icon={BookOpen} sublabel={`${inst.length} instalments`} />
        <StatCard label="Settled" value={formatCurrency(settled)} icon={Banknote} tone="success"
          progress={billed > 0 ? Math.round((settled / billed) * 100) : 0} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)}
          tone={outstanding > 0 ? "danger" : "success"} />
        <StatCard label="Allocations" value={alloc.length} sublabel="Payments matched to months" />
      </div>

      <Tabs defaultValue="instalments">
        <TabsList>
          <TabsTrigger value="instalments">Instalments ({inst.length})</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({alloc.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="instalments">
          {inst.length === 0 ? (
            <EmptyState icon={BookOpen} title="No instalments" description="Activating a lease generates its rent schedule." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due</TableHead><TableHead>Lease</TableHead><TableHead>Tenant</TableHead>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {inst.map((i) => {
                  const lease = one(i.leases);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-neutral-600">{formatDate(i.due_date)}</TableCell>
                      <TableCell>
                        {lease ? <Link href={`/leases/${lease.id}`} className="text-neutral-900 hover:underline">{lease.lease_code}</Link> : "—"}
                      </TableCell>
                      <TableCell className="text-neutral-600">{one(lease?.tenants)?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-neutral-500">{i.instalment_number}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(i.original_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(i.outstanding_amount) > 0
                          ? <span className="text-red-700">{formatCurrency(i.outstanding_amount)}</span>
                          : <span className="text-neutral-400">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="allocations">
          {alloc.length === 0 ? (
            <EmptyState icon={Banknote} title="Nothing allocated"
              description="Record a payment and allocate it to a month; the trail appears here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allocated</TableHead><TableHead>Payment</TableHead><TableHead>Payer</TableHead>
                  <TableHead>Settled</TableHead><TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {alloc.map((a) => {
                  const pay = one(a.payments);
                  const ri = one(a.rent_instalments);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-neutral-600">{formatDate(a.created_at)}</TableCell>
                      <TableCell className="tabular-nums text-neutral-800">{pay?.reference ?? "—"}</TableCell>
                      <TableCell className="text-neutral-600">{one(pay?.tenants)?.name ?? "—"}</TableCell>
                      <TableCell className="text-neutral-600">
                        {ri ? `${one(ri.leases)?.lease_code ?? ""} #${ri.instalment_number}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">+{formatCurrency(a.amount)}</TableCell>
                      <TableCell>{pay ? <StatusBadge status={pay.status} /> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
