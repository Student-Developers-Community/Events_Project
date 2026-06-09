import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Is the given email a platform super-admin? Checked via service-role so the
 * locked-down super_admins table stays invisible to everyone else.
 */
export async function isSuperAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const svc = getSupabaseServiceClient();
  if (!svc) return false;
  const { data } = await svc
    .from("super_admins")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}

/** Returns the super-admin user, or null (no redirect). */
export async function getSuperAdminOrNull() {
  const sb = await getSupabaseServerClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return null;
  return (await isSuperAdminEmail(user.email)) ? user : null;
}

/**
 * Guard for /admin/* pages + actions. Redirects:
 *   · not signed in        → /auth/login?next=/admin
 *   · signed in, not super → /admin/denied
 */
export async function requireSuperAdmin() {
  const sb = await getSupabaseServerClient();
  if (!sb) redirect("/");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (!(await isSuperAdminEmail(user.email))) redirect("/admin/denied");
  return user;
}
