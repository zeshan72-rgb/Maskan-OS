"use server";

import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/permissions/context";
import { landingPathFor } from "@/lib/permissions/guards";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  signInSchema, forgotPasswordSchema, resetPasswordSchema, acceptInvitationSchema,
} from "@/lib/validation/auth";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password. Please try again." };
  }

  // Route by role, not to a fixed path. A tenant, owner or vendor must not
  // land in the manager application; landingPathFor decides where they go.
  redirect(landingPathFor(await requireContext()));
}

export async function signOutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.flatten().fieldErrors.email?.[0] ?? "" } };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Always report success even if the email doesn't exist, to avoid leaking
  // which addresses have accounts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });
  return {};
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { password: fe.password?.[0] ?? "", confirmPassword: fe.confirmPassword?.[0] ?? "" } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect(landingPathFor(await requireContext()));
}

/**
 * Accepts an invitation: validates the token via a SECURITY DEFINER RPC
 * (so an unauthenticated visitor can look up a single invitation by its
 * unguessable token without a broad table-select policy), creates the
 * auth user + profile, and attaches them to the organisation with the
 * invited role.
 */
export async function acceptInvitationAction(
  token: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse({
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        fullName: fe.fullName?.[0] ?? "",
        password: fe.password?.[0] ?? "",
        confirmPassword: fe.confirmPassword?.[0] ?? "",
      },
    };
  }

  const admin = createAdminClient();

  const { data: invitation, error: invError } = await admin
    .from("invitations")
    .select("id, organisation_id, email, role_id, owner_id, tenant_id, vendor_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invError || !invitation) return { error: "This invitation link is invalid." };
  if (invitation.status !== "pending") return { error: "This invitation has already been used or revoked." };
  if (new Date(invitation.expires_at) < new Date()) return { error: "This invitation has expired. Ask your admin to resend it." };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    return { error: createError?.message ?? "Could not create your account. The email may already be registered." };
  }

  await admin.from("profiles").insert({ id: created.user.id, full_name: parsed.data.fullName, email: invitation.email });

  const { data: member } = await admin
    .from("organisation_members")
    .insert({
      organisation_id: invitation.organisation_id,
      profile_id: created.user.id,
      owner_id: invitation.owner_id,
      tenant_id: invitation.tenant_id,
      vendor_id: invitation.vendor_id,
    })
    .select("id")
    .single();

  if (member) {
    await admin.from("member_roles").insert({ organisation_member_id: member.id, role_id: invitation.role_id });
  }

  await admin.from("invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: invitation.email, password: parsed.data.password });

  revalidatePath("/", "layout");
  redirect(landingPathFor(await requireContext()));
}

/**
 * The session is written by signInWithPassword just above, but
 * getSessionContext is cached per request and may have been primed with
 * "signed out" earlier in the same request. Reading it fresh here keeps the
 * redirect honest; if it somehow comes back empty we fall back to the guard,
 * which will send the user to /sign-in or /no-organisation as appropriate.
 */
async function requireContext() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  return ctx;
}
