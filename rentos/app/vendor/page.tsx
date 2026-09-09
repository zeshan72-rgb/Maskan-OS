import { AlertCircle, CheckCircle2, Wrench } from "lucide-react";
import { requireRole } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { listVendorJobs } from "@/features/maintenance/queries";
import { VendorJobCard } from "@/features/maintenance/components/vendor-job-card";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const DONE = ["completed", "closed", "cancelled"];

export default async function VendorPortalPage() {
  const { ctx, membership } = await requireRole("vendor");

  // The vendor link may sit on the membership, or only in vendor_members
  // when the account was attached to a vendor without a membership column.
  let vendorId = membership.vendorId;
  if (!vendorId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vendor_members")
      .select("vendor_id")
      .eq("profile_id", ctx.userId)
      .eq("is_active", true)
      .limit(1);
    vendorId = data?.[0]?.vendor_id ?? null;
  }

  if (!vendorId) {
    return (
      <PortalLayout title="Contractor">
        <EmptyState
          icon={AlertCircle}
          title="Your account is not linked to a vendor"
          description="The vendor role is set, but no vendor record is attached. An administrator needs to link it."
        />
      </PortalLayout>
    );
  }

  const jobs = await listVendorJobs(vendorId);
  const active = jobs.filter((j) => !DONE.includes(j.status));
  const finished = jobs.filter((j) => DONE.includes(j.status));
  const approvedValue = active.reduce((sum, j) => sum + (j.approved_amount ?? j.estimated_cost ?? 0), 0);

  return (
    <PortalLayout title="Contractor">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Your jobs</h1>
        <p className="text-sm text-neutral-500">
          Only work orders assigned to you. Update each one as you accept, arrive and finish.
        </p>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Active jobs" value={active.length} icon={Wrench} />
        <StatCard
          label="Urgent"
          value={active.filter((j) => j.priority === "emergency").length}
          tone={active.some((j) => j.priority === "emergency") ? "danger" : "success"}
        />
        <StatCard label="Approved value" value={formatCurrency(approvedValue)} sublabel="Across active jobs" />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({finished.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {active.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing assigned right now"
              description="New work orders appear here as soon as they are assigned to you."
            />
          ) : (
            <div className="stagger space-y-3">
              {active.map((job) => (
                <VendorJobCard key={job.workOrderId} job={job} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="done">
          {finished.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No completed jobs yet" description="Finished work appears here." />
          ) : (
            <div className="stagger space-y-3">
              {finished.map((job) => (
                <VendorJobCard key={job.workOrderId} job={job} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
