import { AlertTriangle } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_OFFER, offerMaths } from "@/features/leasing/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * The offer builder.
 *
 * The point of this screen is the last row of each card: what the deal
 * earns per year once the void is counted. A longer term always shows a
 * bigger total and frequently earns less annually, because a short term is
 * never really short — the unit sits empty while it is re-let. Comparing
 * totals is how owners talk themselves into worse deals.
 *
 * TODO: stub data, and read-only. See features/leasing/stub-data.ts. Making
 * the inputs editable needs client state plus an offers table to save into.
 */
export default async function OfferBuilderPage() {
  await requireStaff();

  const rows = STUB_OFFER.scenarios.map((s) => ({ s, m: offerMaths(s) }));
  const best = rows.reduce((a, b) => (b.m.withVoid > a.m.withVoid ? b : a));
  const tied = rows.filter((r) => r.m.withVoid === best.m.withVoid).length > 1;

  return (
    <>
      <PageHeader
        title="Build an offer"
        breadcrumbs={[{ label: "Offers", href: "/offers" }, { label: "Builder" }]}
        description={`${STUB_OFFER.unit} · asking ${formatCurrency(STUB_OFFER.asking)} a month · ${STUB_OFFER.client}`}
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <p className="text-sm leading-relaxed text-sky-900">
          <strong>Compare annually, not in total.</strong> A longer term always shows a bigger
          total. What matters is what the unit earns per year, and a short term is never really
          short because it sits empty while you re-let it.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(({ s, m }) => {
          const isBest = !tied && s.id === best.s.id;
          return (
            <Card key={s.id} className={isBest ? "border-neutral-900" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{s.name}</CardTitle>
                  {isBest && <Badge variant="success">Best</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  {[
                    ["Term", `${s.termMonths} months`],
                    ["Monthly rent", formatCurrency(s.monthlyRent)],
                    ["Rent free", s.freeMonths ? `${s.freeMonths} at the ${s.freeAt}` : "None"],
                    ["Bills", s.billsIncluded ? `Included to ${formatCurrency(s.billsCap)}` : "Tenant pays"],
                    ["Cheques", s.chequeCount],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3 py-1.5">
                      <dt className="text-neutral-500">{k}</dt>
                      <dd className="text-right tabular-nums text-neutral-900">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 space-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm">
                  {[
                    ["Months charged", `${m.chargedMonths} of ${s.termMonths}`],
                    ["Tenant pays", formatCurrency(m.gross)],
                    ...(m.bills ? [["Bills you carry", `−${formatCurrency(m.bills)}`] as [string, string]] : []),
                    ["Management fee", `−${formatCurrency(m.fee)}`],
                    ["To the owner", formatCurrency(m.net)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-neutral-500">{k}</span>
                      <span className="tabular-nums text-neutral-800">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-neutral-200 pt-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">A year, with the void</p>
                  <p className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-neutral-900">
                    {formatCurrency(m.withVoid)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatCurrency(m.annualised)} before the {STUB_OFFER.assume.voidMonths}-month void
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle>Assumptions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {[
              ["Void between tenancies", `${STUB_OFFER.assume.voidMonths} month`],
              ["Cost to re-let", formatCurrency(STUB_OFFER.assume.reletCost)],
              ["Management fee", `${STUB_OFFER.assume.feePct}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">{k}</p>
                <p className="mt-1 tabular-nums text-neutral-900">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            These drive every figure above. Change the void and the ranking can change with it.
          </p>
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button>Send to the owner</Button>
        <Button variant="outline">Save as a draft</Button>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Sample data and read-only. See features/leasing/stub-data.ts.
      </p>
    </>
  );
}
