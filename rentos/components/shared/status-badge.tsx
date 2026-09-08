import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

// Centralised status -> colour mapping so the same status always renders the
// same colour everywhere in the app (tables, cards, timelines).
const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  // units
  vacant: { label: "Vacant", variant: "neutral" },
  occupied: { label: "Occupied", variant: "success" },
  reserved: { label: "Reserved", variant: "info" },
  maintenance: { label: "Maintenance", variant: "warning" },
  inactive: { label: "Inactive", variant: "outline" },
  // leases
  draft: { label: "Draft", variant: "neutral" },
  pending: { label: "Pending", variant: "info" },
  active: { label: "Active", variant: "success" },
  expiring: { label: "Expiring", variant: "warning" },
  renewal_offered: { label: "Renewal Offered", variant: "info" },
  renewed: { label: "Renewed", variant: "success" },
  expired: { label: "Expired", variant: "danger" },
  terminated: { label: "Terminated", variant: "danger" },
  // instalments
  upcoming: { label: "Upcoming", variant: "neutral" },
  due: { label: "Due", variant: "info" },
  partial: { label: "Partial", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
  waived: { label: "Waived", variant: "outline" },
  // cheques
  received: { label: "Received", variant: "neutral" },
  stored: { label: "Stored", variant: "neutral" },
  due_soon: { label: "Due Soon", variant: "warning" },
  submitted: { label: "Submitted", variant: "info" },
  cleared: { label: "Cleared", variant: "success" },
  bounced: { label: "Bounced", variant: "danger" },
  replaced: { label: "Replaced", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
  // payments
  pending_verification: { label: "Pending Verification", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  refunded: { label: "Refunded", variant: "outline" },
  failed: { label: "Failed", variant: "danger" },
  // maintenance
  submitted_mr: { label: "Submitted", variant: "neutral" },
  reviewing: { label: "Reviewing", variant: "info" },
  assigned: { label: "Assigned", variant: "info" },
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  waiting: { label: "Waiting", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  closed: { label: "Closed", variant: "outline" },
  // org
  trial: { label: "Trial", variant: "info" },
  suspended: { label: "Suspended", variant: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), variant: "neutral" as Variant };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
