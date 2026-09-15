import { AlertCircle, FileSignature, PenLine, Printer } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import { createClient } from "@/lib/supabase/server";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type LeaseDocRow = {
  id: string; title: string; is_signed: boolean; created_at: string; storage_path: string | null;
};
type PartyRow = { id: string; party_type: string; name: string; qid_or_passport: string | null };

/**
 * The tenancy agreement and who has signed it.
 *
 * Both signing routes are first class. A wet signature is printed, signed
 * and the scan uploaded back against the same contract; an e-signature is
 * stamped with the time. Most Qatari landlords still use the first, so a
 * portal that only offers the second is not usable here.
 */
export default async function TenantContractPage() {
  const { tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const { data: leases } = await supabase
    .from("leases").select(
      "id, lease_code, status, start_date, end_date"
    )
    .eq("tenant_id", tenantId).order("start_date", { ascending: false });
  const lease = (leases ?? [])[0];

  if (!lease) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={FileSignature} title="No agreement yet"
          description="Your tenancy agreement appears here once it is drawn up." />
      </PortalLayout>
    );
  }

  const [{ data: docs }, { data: parties }] = await Promise.all([
    supabase.from("lease_documents")
      .select(
      "id, title, is_signed, created_at, storage_path"
    )
      .eq("lease_id", lease.id).order("created_at", { ascending: false }),
    supabase.from("lease_parties")
      .select(
      "id, party_type, name, qid_or_passport"
    ).eq("lease_id", lease.id),
  ]);

  const documents = (docs ?? []) as LeaseDocRow[];
  const signatories = (parties ?? []) as PartyRow[];
  const signed = documents.filter((d) => d.is_signed);

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">The agreement</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {lease.lease_code} · {formatDate(lease.start_date)} to {formatDate(lease.end_date)}
      </p>

      {documents.length === 0 ? (
        <EmptyState icon={FileSignature} title="Not drawn up yet"
          description="Once the agreement is generated it appears here for signing." />
      ) : (
        <div className="stagger space-y-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">{d.title}</h2>
                    <p className="text-xs text-neutral-500">Added {formatDate(d.created_at)}</p>
                  </div>
                  <Badge variant={d.is_signed ? "success" : "warning"}>
                    {d.is_signed ? "Signed" : "Awaiting signature"}
                  </Badge>
                </div>

                {!d.is_signed && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <p className="mb-3 text-sm text-neutral-600">
                      Two ways to sign. Either is binding; pick whichever suits you.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-neutral-200 p-3.5">
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                          <PenLine className="h-4 w-4 text-neutral-400" /> Sign on screen
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Stamped with the time and your address. Nothing to print.
                        </p>
                        <Button size="sm" className="mt-3">Sign electronically</Button>
                      </div>
                      <div className="rounded-lg border border-neutral-200 p-3.5">
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                          <Printer className="h-4 w-4 text-neutral-400" /> Print and sign
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Print it, sign by hand, then send the scan back.
                        </p>
                        <Button variant="outline" size="sm" className="mt-3">Download to print</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {signatories.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Who else signs</h2>
            <div className="space-y-1.5">
              {signatories.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                  <span className="text-neutral-900">{p.name}</span>
                  <Badge variant="outline">{p.party_type.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        The signing buttons are not wired up: e-signature and document generation are not
        implemented, and {signed.length > 0 ? "downloads need a signed storage URL" : "there is nothing to download yet"}.
      </p>
    </PortalLayout>
  );
}
