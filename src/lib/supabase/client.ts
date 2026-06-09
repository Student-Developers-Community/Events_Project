"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (singleton-ish — createBrowserClient handles
 * its own dedup). Safe to import from "use client" components.
 *
 * Returns null if env vars are missing so the rest of the app doesn't crash
 * during development before the Supabase project is wired up.
 */
export function getSupabaseBrowserClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}
