"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema, passwordSchema } from "./schemas";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const nullable = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/** Update the current organiser's profile row. */
export async function updateProfileAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    phone:        formData.get("phone") ?? "",
    bio:          formData.get("bio") ?? "",
    avatar_url:   formData.get("avatar_url") ?? "",
    website_url:  formData.get("website_url") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Server not configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await sb
    .from("organisers")
    .update({
      display_name: v.display_name,
      phone:        nullable(v.phone),
      bio:          nullable(v.bio),
      avatar_url:   nullable(v.avatar_url),
      website_url:  nullable(v.website_url),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard", "layout");   // navbar uses display_name
  return { ok: true, message: "Profile saved" };
}

/** Change the logged-in user's password. */
export async function changePasswordAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse({
    new_password: formData.get("new_password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Server not configured" };

  const { error } = await sb.auth.updateUser({ password: parsed.data.new_password });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Password updated" };
}
