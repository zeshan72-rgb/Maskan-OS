import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/permissions/context";
import { landingPathFor } from "@/lib/permissions/guards";

export const dynamic = "force-dynamic";

/**
 * The front door.
 *
 * Without this, `/` is a 404 and everyone has to type /sign-in by hand.
 *
 * No routing rules live here on purpose. landingPathFor() already decides
 * where each role belongs, it is covered by seven tests, and it is what
 * requireStaff() and the sign-in action both call. Restating the mapping
 * here would give us a second copy to keep in step, and the last time this
 * logic was duplicated (a hardcoded redirect to /dashboard in the sign-in
 * action) every portal user landed in the manager app.
 *
 * The only decision made here is signed out versus signed in.
 */
export default async function RootPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  redirect(landingPathFor(ctx));
}
