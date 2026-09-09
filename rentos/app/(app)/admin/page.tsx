import { Building2, Layers, TrendingUp, Users } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import {
  getPlatformMetrics,
  listAdminOrganisations,
  listPlans,
  listPlatformUsers,
  listPlatformAudit,
} from "@/features/admin/queries";
import { OrganisationStatusSelect, PlanSelect } from "@/features/admin/components/admin-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * listPlans, listPlatformUsers and listPlatformAudit have no declared return
 * type in features/admin/queries.ts, so under `strict` their callback
 * parameters are implicitly `any`. These local shapes mirror the columns
 * those queries actually select; remove them once the queries are annotated.
 */
type PlanRow = {
  id: string;
  key: string;
  name: string;
  max_units: number | null;
  max_users: number | null;
  storage_mb: number | null;
  monthly_price_qar: number | null;
  is_active: boolean;
};

type PlatformUserRow = {
  id: string;
  full_name: string;
  email: string;
  is_platform_super_admin: boolean;
  created_at: string;
  organisationNames: string[];
  roleKeys: string[];
};

type AuditRow = {
  id: string;
  action: string;
  entity_table: string;
  created_at: string;
  actorName: string | null;
  organisationName: string | null;
};


export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // Platform administration is separate from any organisation: this guard
  // redirects anyone who is not a platform super admin.
  await requirePlatformSuperAdmin();

  const [metrics, organisations, plans, users, audit] = await Promise.all([
    getPlatformMetrics(),
    listAdminOrganisations(q),
    listPlans(),
    listPlatformUsers(q),
    listPlatformAudit(q),
  ]);

  const planRows = plans as PlanRow[];
  const userRows = users as PlatformUserRow[];
  const auditRows = audit as AuditRow[];
  const planOptions = planRows.map((p) => ({ id: p.id, name: p.name }));
  const occupancyPct =
    metrics.units > 0 ? Math.round((metrics.occupiedUnits / metrics.units) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Platform administration"
        description="Every organisation on the platform, their plan and their usage."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Organisations"
          value={metrics.organisations}
          icon={Building2}
          sublabel={`${metrics.activeOrganisations} active · ${metrics.trials} trial · ${metrics.suspended} suspended`}
        />
        <StatCard label="Users" value={metrics.users} icon={Users} />
        <StatCard
          label="Units under management"
          value={metrics.units}
          icon={Layers}
          progress={occupancyPct}
          sublabel={`${occupancyPct}% occupied across ${metrics.properties} properties`}
        />
        <StatCard
          label="Rent under management"
          value={formatCurrency(metrics.monthlyRentUnderManagement)}
          icon={TrendingUp}
          tone="success"
          sublabel={`${metrics.collectionRate}% collection · ${metrics.activeLeases} active leases`}
        />
      </div>

      <Tabs defaultValue="organisations">
        <TabsList>
          <TabsTrigger value="organisations">Organisations ({organisations.length})</TabsTrigger>
          <TabsTrigger value="plans">Plans ({planRows.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({userRows.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit ({auditRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="organisations">
          {organisations.length === 0 ? (
            <EmptyState icon={Building2} title="No organisations" description="Nothing has signed up yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Leases</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {organisations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <span className="font-medium text-neutral-900">{org.name}</span>
                      <p className="text-xs text-neutral-500">{org.email ?? org.slug}</p>
                    </TableCell>
                    <TableCell>
                      <PlanSelect
                        organisationId={org.id}
                        planId={planRows.find((p) => p.name === org.planName)?.id ?? null}
                        plans={planOptions}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{org.members}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.units}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.activeLeases}</TableCell>
                    <TableCell>
                      <Badge variant={org.onboarding_step === "complete" ? "success" : "warning"}>
                        {org.onboarding_step}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <OrganisationStatusSelect organisationId={org.id} status={org.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="plans">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Max units</TableHead>
                <TableHead className="text-right">Max users</TableHead>
                <TableHead className="text-right">Storage</TableHead>
                <TableHead className="text-right">Monthly price</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger">
              {planRows.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-neutral-900">{plan.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{plan.max_units ?? "Unlimited"}</TableCell>
                  <TableCell className="text-right tabular-nums">{plan.max_users ?? "Unlimited"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {plan.storage_mb ? `${plan.storage_mb} MB` : "Unlimited"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {plan.monthly_price_qar ? formatCurrency(plan.monthly_price_qar) : "Custom"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "success" : "neutral"}>
                      {plan.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="users">
          {userRows.length === 0 ? (
            <EmptyState icon={Users} title="No users" description="No accounts match." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {userRows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-neutral-900">
                      {user.full_name}
                      {user.is_platform_super_admin && (
                        <Badge variant="info" className="ml-2">Platform</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-600">{user.email}</TableCell>
                    <TableCell className="text-neutral-600">{user.organisationNames.join(", ") || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roleKeys.length === 0 ? (
                          <span className="text-xs text-neutral-400">None</span>
                        ) : (
                          user.roleKeys.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600">{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="audit">
          {auditRows.length === 0 ? (
            <EmptyState icon={Layers} title="No audit entries" description="Recorded actions appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Organisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {auditRows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-neutral-600">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-neutral-800">{entry.actorName ?? "System"}</TableCell>
                    <TableCell>
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">
                        {entry.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-neutral-600">{entry.entity_table}</TableCell>
                    <TableCell className="text-neutral-600">{entry.organisationName ?? "—"}</TableCell>
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
