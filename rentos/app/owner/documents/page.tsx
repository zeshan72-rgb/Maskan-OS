import { AlertCircle, FileText } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { createClient } from "@/lib/supabase/server";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function OwnerDocumentsPage() {
  const { membership, ownerId } = await requireOwner();
  if (!ownerId) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to an owner record"
          description="An administrator needs to attach this account to an owner." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const { data: shares } = await supabase
    .from("property_owners").select(
      "property_id"
    ).eq("owner_id", ownerId);
  const propertyIds = (shares ?? []).map((s) => s.property_id);

  // Paperwork filed against the owner's properties, plus anything filed
  // organisation-wide against this owner record.
  const [{ data: propDocs }, { data: orgDocs }] = await Promise.all([
    propertyIds.length
      ? supabase.from("property_documents")
          .select(
      "id, title, category, created_at, properties ( name )"
    )
          .in("property_id", propertyIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("documents")
      .select(
      "id, title, category, created_at, related_table, related_id"
    )
      .eq("organisation_id", membership.organisationId)
      .eq("related_table", "owners").eq("related_id", ownerId)
      .order("created_at", { ascending: false }),
  ]);

  const rows = [
    ...(propDocs ?? []).map((d) => ({
      id: d.id, title: d.title, category: d.category,
      created_at: d.created_at, context: one(d.properties)?.name ?? "Property",
    })),
    ...(orgDocs ?? []).map((d) => ({
      id: d.id, title: d.title, category: d.category,
      created_at: d.created_at, context: "Filed against you",
    })),
  ];

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Documents</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Title deeds, agreements and anything else held against your properties.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Documents" value={rows.length} icon={FileText} />
        <StatCard label="Properties covered" value={propertyIds.length} />
        <StatCard label="Categories" value={new Set(rows.map((r) => r.category)).size} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet"
          description="Paperwork filed against your properties will appear here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead><TableHead>Category</TableHead>
              <TableHead>Relates to</TableHead><TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-neutral-900">{d.title}</TableCell>
                <TableCell className="capitalize text-neutral-600">
                  {String(d.category).replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-neutral-600">{d.context}</TableCell>
                <TableCell className="text-neutral-600">{formatDate(d.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Downloads are not wired up: files live in Supabase storage and need a signed URL,
        which this screen does not yet request.
      </p>
    </PortalLayout>
  );
}
