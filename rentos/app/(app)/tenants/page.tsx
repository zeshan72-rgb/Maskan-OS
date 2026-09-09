import Link from "next/link";
import { Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function TenantsPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  // Each tenant is listed with their live lease, so the page shows where
  // someone actually sits rather than being a bare contact book.
  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, name, qid_or_passport, email, phone, employer, " +
        "leases ( id, lease_code, status, units ( unit_number ), properties ( name ) )"
    )
    .eq("organisation_id", membership.organisationId)
    .is("archived_at", null)
    .order("name");

  const rows = tenants ?? [];

  return (
    <>
      <PageHeader title="Tenants" description={`${rows.length} tenant${rows.length === 1 ? "" : "s"} on record.`} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants yet"
          description="Tenants are created as part of the lease wizard, so start there."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>QID / passport</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Current tenancy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((tenant) => {
              const leases = (tenant.leases ?? []) as {
                id: string;
                status: string;
                units: { unit_number: string } | { unit_number: string }[] | null;
                properties: { name: string } | { name: string }[] | null;
              }[];
              const live = leases.find((l) => ["active", "expiring", "renewal_offered"].includes(l.status));
              const unit = one(live?.units);
              const property = one(live?.properties);
              return (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link href={`/tenants/${tenant.id}`} className="font-medium text-neutral-900 hover:underline">
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-neutral-600">{tenant.qid_or_passport ?? "—"}</TableCell>
                  <TableCell className="text-neutral-600">{tenant.phone ?? tenant.email ?? "—"}</TableCell>
                  <TableCell className="text-neutral-600">{tenant.employer ?? "—"}</TableCell>
                  <TableCell>
                    {live ? (
                      <Link href={`/leases/${live.id}`} className="text-neutral-800 hover:underline">
                        {property?.name ?? "—"}
                        {unit ? ` · ${unit.unit_number}` : ""}
                      </Link>
                    ) : (
                      <Badge variant="neutral">No active lease</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
