"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/features/notifications/service";
import { toSafeError, type FormState } from "@/lib/utils/form-state";

/**
 * Thin server-action wrappers over the notification service, so client
 * components can mark items read without importing server-only code.
 *
 * Both rely on RLS to scope notifications to the signed-in profile; neither
 * takes an organisation id from the caller.
 */
export async function markNotificationReadAction(notificationId: string): Promise<FormState> {
  try {
    await markNotificationRead(notificationId);
    revalidatePath("/", "layout");
    return { status: "success" };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<FormState> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { status: "error", message: "You are not signed in." };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("profile_id", auth.user.id)
      .eq("is_read", false);
    if (error) throw error;

    revalidatePath("/", "layout");
    return { status: "success", message: "All notifications marked as read." };
  } catch (error) {
    return toSafeError(error);
  }
}
