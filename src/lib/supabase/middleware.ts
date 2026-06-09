import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh middleware.
 * - Refreshes Supabase auth tokens on every navigation.
 * - Redirects unauthenticated users away from /admin/* and /dashboard/*.
 *
 * Gracefully no-ops if Supabase env vars aren't configured yet (early dev).
 */
export async function updateSession(request: NextRequest) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/admin") ||
    path === "/create" ||
    path.startsWith("/my-tickets");
  const isLoginPage = path === "/auth/login";

  if (isProtected && !user) {
    const u = request.nextUrl.clone();
    u.pathname = "/auth/login";
    u.searchParams.set("next", path);
    return NextResponse.redirect(u);
  }

  if (isLoginPage && user) {
    const u = request.nextUrl.clone();
    u.pathname = "/";
    return NextResponse.redirect(u);
  }

  return response;
}
