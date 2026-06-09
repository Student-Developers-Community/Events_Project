import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Returns the logged-in auth.user if any, else null. Safe to call in any RSC. */
export async function getSessionUser() {
  const sb = await getSupabaseServerClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

/** Returns the organiser row matched to the logged-in user, or null. */
export async function getCurrentOrganiser() {
  const sb = await getSupabaseServerClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("organisers")
    .select("id, display_name, email, avatar_url, is_verified")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}
