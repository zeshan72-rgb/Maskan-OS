import { AlertCircle, FileText } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import { getTenantDocuments } from "@/features/portals/tenant-queries";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** getTenantDocuments returns two arrays; lease documents carry no category. */
type TenantDocs = {
  tenantDocuments: { id: string; title: string; category: string; created_at: string }[];
  leaseDocuments: { id: string; title: string; created_at: string }[];
};

export default async function TenantDocumentsPage() {
  const { tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const docs = (await getTenantDocuments(tenantId)) as TenantDocs;
  const rows = [
    ...docs.leaseDocuments.map((d) => ({ ...d, category: "lease", source: "Your tenancy" })),
    ...docs.tenantDocuments.map((d) => ({ ...d, source: "Filed for you" })),
  ];

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Documents</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Your agreement, your identification, and anything else we hold for you.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Documents" value={rows.length} icon={FileText} />
        <StatCard label="Tenancy paperwork" value={docs.leaseDocuments.length} />
        <StatCard label="Filed for you" value={docs.tenantDocuments.length} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="Nothing here yet"
          description="Your tenancy agreement and any paperwork we hold will appear here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead><TableHead>Category</TableHead>
              <TableHead>Source</TableHead><TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-neutral-900">{d.title}</TableCell>
                <TableCell className="capitalize text-neutral-600">
                  {String(d.category).replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-neutral-600">{d.source}</TableCell>
                <TableCell className="text-neutral-600">{formatDate(d.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Downloads are not wired up: files sit in Supabase storage and need a signed URL,
        which this screen does not yet request.
      </p>
    </PortalLayout>
  );
}
