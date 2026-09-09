import Link from "next/link";
import { Landmark } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  const { data: owners } = await supabase
    .from("owners")
    .select("id, name, kind, qid_or_cr, email, phone, property_owners ( property_id )")
    .eq("organisation_id", membership.organisationId)
    .is("archived_at", null)
    .order("name");

  const rows = owners ?? [];

  return (
    <>
      <PageHeader
        title="Owners"
        description={`${rows.length} owner${rows.length === 1 ? "" : "s"}. Statements and payouts are issued per owner.`}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No owners yet"
          description="Owners are attached to properties, and each receives their own statement."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>QID / CR</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Properties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger">
            {rows.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <Link href={`/owners/${owner.id}`} className="font-medium text-neutral-900 hover:underline">
                    {owner.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{owner.kind === "company" ? "Company" : "Individual"}</Badge>
                </TableCell>
                <TableCell className="tabular-nums text-neutral-600">{owner.qid_or_cr ?? "—"}</TableCell>
                <TableCell className="text-neutral-600">{owner.phone ?? owner.email ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-neutral-800">
                  {(owner.property_owners ?? []).length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
