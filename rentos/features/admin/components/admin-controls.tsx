"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { setOrganisationStatusAction, assignPlanAction } from "@/features/admin/actions";
import type { OrgStatus } from "@/types/database";

const STATUSES: { value: OrgStatus; label: string }[] = [
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrganisationStatusSelect({
  organisationId,
  status,
}: {
  organisationId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: OrgStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await setOrganisationStatusAction(organisationId, next);
      if (result.status === "success") {
        toast.success(result.message ?? "Updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not change the status.");
      }
    });
  }

  return (
    <Select
      aria-label="Organisation status"
      value={status}
      disabled={pending}
      onChange={(e) => change(e.target.value as OrgStatus)}
      className="w-36"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );
}

export function PlanSelect({
  organisationId,
  planId,
  plans,
}: {
  organisationId: string;
  planId: string | null;
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(nextPlanId: string) {
    if (!nextPlanId || nextPlanId === planId) return;
    startTransition(async () => {
      const result = await assignPlanAction(organisationId, nextPlanId);
      if (result.status === "success") {
        toast.success(result.message ?? "Plan updated.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not change the plan.");
      }
    });
  }

  return (
    <Select
      aria-label="Subscription plan"
      value={planId ?? ""}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      className="w-40"
    >
      <option value="">No plan assigned</option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </Select>
  );
}
