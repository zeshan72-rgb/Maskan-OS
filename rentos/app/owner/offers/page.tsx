import { FileSignature } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { STUB_OFFER, offerMaths } from "@/features/leasing/stub-data";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Offers put to the owner for a decision.
 *
 * The owner-facing version deliberately leads with what each option earns
 * per year once the void is counted, not the contract total. An owner asked
 * to compare a 12-month and a 24-month offer on total value will pick the
 * bigger number, and that is frequently the worse deal.
 *
 * TODO: stub data, and the Accept and Decline buttons are inert. See
 * features/leasing/stub-data.ts; there is no offers table.
 */
export default async function OwnerOffersPage() {
  await requireOwner();
  const rows = STUB_OFFER.scenarios.map((s) => ({ s, m: offerMaths(s) }));
  const best = rows.reduce((a, b) => (b.m.withVoid > a.m.withVoid ? b : a));
  const tied = rows.filter((r) => r.m.withVoid === best.m.withVoid).length > 1;

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">An offer for your decision</h1>
          <p className="text-sm text-neutral-500">
            {STUB_OFFER.unit} · {STUB_OFFER.property} · asking {formatCurrency(STUB_OFFER.asking)} a month
          </p>
        </div>
        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
          Sample data
        </span>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Applicant" value={STUB_OFFER.client} icon={FileSignature} />
        <StatCard label="Options put to you" value={rows.length} />
        <StatCard label="Best per year" value={formatCurrency(best.m.withVoid)} tone="success"
          sublabel={tied ? "Two options are level" : best.s.name} />
      </div>

      <div className="mb-5 rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
        <strong className="text-neutral-900">Compare the yearly figure, not the total.</strong>{" "}
        A longer term always shows a bigger total. What matters is what the unit earns in a
        year, and a short term is never really short: it sits empty while it is re-let. The
        figure below accounts for that.
      </div>

      <div className="stagger space-y-3">
        {rows.map(({ s, m }) => {
          const isBest = !tied && s.id === best.s.id;
          return (
            <Card key={s.id} className={isBest ? "border-neutral-900" : undefined}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-neutral-900">{s.name}</h2>
                      {isBest && <Badge variant="success">Earns most</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {s.termMonths} months at {formatCurrency(s.monthlyRent)}
                      {s.freeMonths > 0 && `, ${s.freeMonths} rent free at the ${s.freeAt}`}
                      {s.billsIncluded && `, bills included to ${formatCurrency(s.billsCap)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">A year, with the void</p>
                    <p className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-neutral-900">
                      {formatCurrency(m.withVoid)}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-2 border-t border-neutral-100 pt-3 text-sm sm:grid-cols-4">
                  {[
                    ["Tenant pays", formatCurrency(m.gross)],
                    ...(m.bills ? [["Bills carried", `−${formatCurrency(m.bills)}`]] : []),
                    ["Our fee", `−${formatCurrency(m.fee)}`],
                    ["To you", formatCurrency(m.net)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-neutral-500">{k}</dt>
                      <dd className="tabular-nums text-neutral-900">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm">Accept this</Button>
                  <Button variant="outline" size="sm">Ask a question</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm">Decline them all</Button>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Sample data, and the buttons are inert. See features/leasing/stub-data.ts.
      </p>
    </PortalLayout>
  );
}
