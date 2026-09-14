import Link from "next/link";
import { Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_LEADS, LEAD_STAGES, type LeadStage } from "@/features/leasing/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * The letting pipeline, as a kanban of stages.
 *
 * TODO: reads features/leasing/stub-data.ts. There is no `leads` table in
 * this schema; see that file for the migration this needs.
 */
export default async function LeasingPage() {
  await requireStaff();
  const leads = STUB_LEADS;
  const live = leads.filter((l) => l.stage !== "lost");
  const byStage = (s: LeadStage) => leads.filter((l) => l.stage === s);

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Every live enquiry, and who is working it. A registered introduction claims the client, not the property."
        actions={
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            Sample data
          </span>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live leads" value={live.length} icon={Users} />
        <StatCard label="Viewings booked" value={byStage("viewing_booked").length} tone="info" />
        <StatCard label="Offers out" value={byStage("offer_made").length} tone="warning" />
        <StatCard label="Reserved" value={byStage("reserved").length} tone="success" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LEAD_STAGES.map((stage) => {
          const items = byStage(stage.value);
          return (
            <div key={stage.value}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-700">{stage.label}</h2>
                <Badge variant="neutral">{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-xs text-neutral-400">
                  Nothing at this stage
                </div>
              ) : (
                <div className="stagger space-y-2">
                  {items.map((l) => {
                    const claimDays = daysUntil(l.claimExpires);
                    return (
                      <Link key={l.id} href={`/leasing/${l.id}`} className="block">
                        <Card className="transition-colors hover:border-neutral-300">
                          <CardContent className="p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-neutral-900">{l.clientName}</span>
                              <Badge variant={l.agentKind === "internal" ? "outline" : "info"}>
                                {l.agentKind === "internal" ? "Our agent" : "Agency"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">{l.unit}</p>
                            <div className="mt-2.5 flex items-center justify-between text-xs">
                              <span className="text-neutral-600">{l.agent}</span>
                              <span className="tabular-nums text-neutral-900">
                                {l.offered ? formatCurrency(l.offered) : formatCurrency(l.budget)}
                              </span>
                            </div>
                            {l.stage !== "lost" && claimDays <= 14 && (
                              <p className="mt-2 text-xs text-amber-700">Claim expires in {claimDays} days</p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Sample data. This screen has no database behind it yet; see
        features/leasing/stub-data.ts for the schema it needs.
      </p>
    </>
  );
}
