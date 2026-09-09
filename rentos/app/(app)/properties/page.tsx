import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { listProperties, getOwnerOptions, PAGE_SIZE } from "@/features/properties/queries";
import { PropertyForm } from "@/features/properties/components/property-form";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROPERTY_TYPES } from "@/lib/validation/entities";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q, type, page } = await searchParams;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "properties.manage");

  const [{ rows, total, page: currentPage }, owners] = await Promise.all([
    listProperties({
      organisationId: membership.organisationId,
      q,
      type,
      page: page ? Number(page) : 1,
    }),
    canManage ? getOwnerOptions(membership.organisationId) : Promise.resolve([]),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Properties"
        description={`${total} propert${total === 1 ? "y" : "ies"} across the portfolio.`}
        actions={canManage ? <PropertyForm owners={owners} mode="create" /> : undefined}
      />

      {/* Filters are plain links so the list stays server-rendered and
          shareable by URL. */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/properties"
          className={`rounded-full border px-3 py-1 text-xs ${
            !type ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          All
        </Link>
        {PROPERTY_TYPES.map((t) => (
          <Link
            key={t.value}
            href={`/properties?type=${t.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              type === t.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q || type ? "No properties match" : "No properties yet"}
          description={
            q || type
              ? "Try a different search or clear the filter."
              : "Add the first property, then its units, then let them."
          }
          action={canManage && !q && !type ? <PropertyForm owners={owners} mode="create" /> : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Occupied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger">
              {rows.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link
                      href={`/properties/${property.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {property.name}
                    </Link>
                    {property.address && (
                      <p className="text-xs text-neutral-500">{property.address}</p>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-neutral-600">{property.property_code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {property.owner_names.length === 0 ? "—" : property.owner_names.join(", ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-neutral-800">{property.unit_count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={property.occupied_count === property.unit_count && property.unit_count > 0 ? "text-emerald-700" : "text-neutral-800"}>
                      {property.occupied_count}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                Page {currentPage} of {lastPage}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/properties?page=${currentPage - 1}${type ? `&type=${type}` : ""}${q ? `&q=${q}` : ""}`}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50"
                  >
                    Previous
                  </Link>
                )}
                {currentPage < lastPage && (
                  <Link
                    href={`/properties?page=${currentPage + 1}${type ? `&type=${type}` : ""}${q ? `&q=${q}` : ""}`}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
