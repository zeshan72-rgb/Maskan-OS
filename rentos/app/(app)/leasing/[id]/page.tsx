import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Phone, Target, UserCheck } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { STUB_LEADS, LEAD_STAGES } from "@/features/leasing/stub-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** TODO: stub data. See features/leasing/stub-data.ts. */
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();

  const lead = STUB_LEADS.find((l) => l.id === id);
  if (!lead) notFound();

  const stageLabel = LEAD_STAGES.find((s) => s.value === lead.stage)?.label ?? lead.stage;
  const claimDays = daysUntil(lead.claimExpires);
  const others = STUB_LEADS.filter((l) => l.unit === lead.unit && l.id !== lead.id);

  return (
    <>
      <PageHeader
        title={lead.clientName}
        breadcrumbs={[{ label: "Pipeline", href: "/leasing" }, { label: lead.code }]}
        description={`${lead.unit} · ${lead.property}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Book a viewing</Button>
            <Link href="/offers/builder"><Button size="sm">Build an offer</Button></Link>
          </div>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stage" value={stageLabel} icon={Target}
          tone={lead.stage === "reserved" ? "success" : lead.stage === "lost" ? "danger" : "default"} />
        <StatCard label="Their budget" value={formatCurrency(lead.budget)} />
        <StatCard label="Offered" value={lead.offered ? formatCurrency(lead.offered) : "—"}
          tone={lead.offered ? "warning" : "default"} />
        <StatCard label="Claim expires" value={`${claimDays} days`} icon={CalendarClock}
          tone={claimDays <= 7 ? "danger" : claimDays <= 14 ? "warning" : "default"}
          sublabel={formatDate(lead.claimExpires)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>The client</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-neutral-100 text-sm">
              {[["Name", lead.clientName], ["Phone", lead.clientPhone], ["Source", lead.source],
                ["Registered", formatDate(lead.registeredAt)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500">{k}</dt><dd className="text-right text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-600">
              <Phone className="h-3.5 w-3.5 text-neutral-400" /> {lead.note}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-neutral-400" /> Who is working it
            </CardTitle>
            <CardDescription>
              Registration claims the client for a fixed window, not the unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5">
              <span className="text-sm font-medium text-neutral-900">{lead.agent}</span>
              <Badge variant={lead.agentKind === "internal" ? "outline" : "info"}>
                {lead.agentKind === "internal" ? "Our agent" : "External agency"}
              </Badge>
            </div>

            {others.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Also working this unit
                </p>
                {others.map((o) => (
                  <div key={o.id} className="mb-1.5 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                    <Link href={`/leasing/${o.id}`} className="text-neutral-800 hover:underline">
                      {o.clientName} · {o.agent}
                    </Link>
                    <span className="text-xs text-neutral-500">{LEAD_STAGES.find(s => s.value === o.stage)?.label}</span>
                  </div>
                ))}
                <p className="mt-2 text-xs text-neutral-500">
                  Different clients, so both claims stand. Whoever completes first earns the commission.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-neutral-400">Sample data. See features/leasing/stub-data.ts.</p>
    </>
  );
}
