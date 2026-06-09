"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema } from "./schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Allow only same-origin relative redirects (paths starting with "/" and no
 * "//" or backslash). Falls back to "/dashboard" otherwise. Prevents open
 * redirect attacks from a malicious ?next=https://evil.com.
 */
function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//"))  return fallback;
  if (raw.includes("\\"))    return fallback;
  return raw;
}

export async function signupAction(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  const { error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
    },
  });
  if (error) return { ok: false, error: error.message };

  const next = safeNext(String(formData.get("next") ?? ""));
  revalidatePath("/", "layout");
  redirect(next);
}

export async function loginAction(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  const { error } = await sb.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  const next = safeNext(String(formData.get("next") ?? ""));
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const sb = await getSupabaseServerClient();
  if (sb) await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
