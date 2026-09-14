import Link from "next/link";
import { Banknote, CreditCard, Landmark, Receipt } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Take a payment, starting from how the money arrived.
 *
 * How it arrived changes everything downstream, which is why this screen
 * asks that first rather than presenting one generic form:
 *
 *   cash      money now, but a receipt must be issued and somebody is
 *             accountable for the notes until they reach the bank
 *   card      money in two working days, not today
 *   transfer  already at the bank, waiting to be matched
 *   cheque    not money at all until it clears, three to five days after
 *             it is deposited
 *
 * Received and cleared are different states, and only clearing moves the
 * ledger. Treating a deposited cheque as settled rent is how a bounce turns
 * into a surprise.
 *
 * TODO: the cash and card branches need fields this schema has no home for:
 * payments has no received_by, receipt destination or expected_clear_on.
 * Until then each method routes to the flow that does exist — allocation
 * for cash and transfer, the cheque register for cheques.
 */
const METHODS = [
  {
    key: "cash", label: "Cash, in person", icon: Banknote, settles: "Today",
    blurb: "They are standing at the desk.",
    needs: ["A receipt, printed and signed", "Who took the money", "Where the notes go"],
    clears: "Immediately. Cash is money.",
    href: "/record-payment", cta: "Choose a lease and allocate",
  },
  {
    key: "card", label: "Card, in person", icon: CreditCard, settles: "+2 days",
    blurb: "Terminal in the office.",
    needs: ["Terminal reference", "Last four digits"],
    clears: "Two working days, when the acquirer settles.",
    href: "/record-payment", cta: "Choose a lease and allocate",
  },
  {
    key: "transfer", label: "Bank transfer", icon: Landmark, settles: "On the statement",
    blurb: "Already landed, or on its way.",
    needs: ["Their reference", "Which account it hit"],
    clears: "Matched at reconciliation.",
    href: "/record-payment", cta: "Choose a lease and allocate",
  },
  {
    key: "cheque", label: "Cheque we hold", icon: Receipt, settles: "+4 days after deposit",
    blurb: "Post-dated, in the drawer.",
    needs: ["Which cheque", "When to deposit"],
    clears: "Three to five days after deposit, if it does not bounce.",
    href: "/payments/cheques", cta: "Open the cheque register",
  },
] as const;

export default async function TakePaymentPage() {
  const { membership } = await requireStaff();
  const supabase = await createClient();

  const [{ count: pending }, { count: heldCheques }] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisationId).eq("status", "pending_verification"),
    supabase.from("cheques").select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisationId).in("status", ["received", "stored", "due_soon"]),
  ]);

  return (
    <>
      <PageHeader
        title="Take a payment"
        description="Start with how the money arrived. It changes what has to be captured and when the ledger moves."
        actions={
          <Link href="/payments"><Button variant="outline" size="sm">All payments</Button></Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {METHODS.map((m) => (
          <Card key={m.key} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <m.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900">{m.label}</h2>
                    <Badge variant={m.settles === "Today" ? "success" : "warning"}>{m.settles}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">{m.blurb}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.needs.map((n) => (
                  <span key={n} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs text-neutral-600">
                    {n}
                  </span>
                ))}
              </div>

              <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">{m.clears}</p>

              <div className="mt-4">
                <Link href={m.href}><Button variant="outline" size="sm">{m.cta}</Button></Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-neutral-50 p-4">
        <p className="text-sm leading-relaxed text-neutral-600">
          <strong className="text-neutral-900">Received is not the same as cleared.</strong> Cash is
          money the moment it is handed over. A cheque is not money until it clears, three to five
          days after you deposit it. The ledger only moves on clearing, which is why a bounced
          cheque puts the debt straight back.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/payments" className="text-neutral-900 underline-offset-2 hover:underline">
            {pending ?? 0} awaiting verification
          </Link>
          <Link href="/payments/cheques" className="text-neutral-900 underline-offset-2 hover:underline">
            {heldCheques ?? 0} cheques held on file
          </Link>
        </div>
      </div>
    </>
  );
}
