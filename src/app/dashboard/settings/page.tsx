import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/settings/ProfileForm";
import PasswordForm from "@/components/settings/PasswordForm";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · TechEvent" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/dashboard/settings");

  const sb = await getSupabaseServerClient();
  if (!sb) redirect("/");

  const { data: organiser } = await sb
    .from("organisers")
    .select("display_name, email, phone, bio, avatar_url, website_url, is_verified, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!organiser) redirect("/");

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-7 py-10">
        <Link href="/dashboard" className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to dashboard
        </Link>

        <header className="mb-8">
          <p className="sec-label mb-2">Account</p>
          <h1 className="sec-title">Settings</h1>
          <p className="sec-sub mt-2">Manage your organiser profile and password.</p>
        </header>

        {/* Profile */}
        <section className="card-base p-7 mb-6">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h2 className="font-bold text-lg">Profile</h2>
            {organiser.is_verified && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{ background: "rgba(0,255,157,.15)", color: "var(--accent)" }}
              >
                ✓ Verified organiser
              </span>
            )}
          </div>
          <ProfileForm
            defaults={{
              display_name: organiser.display_name,
              email:        organiser.email,
              phone:        organiser.phone,
              bio:          organiser.bio,
              avatar_url:   organiser.avatar_url,
              website_url:  organiser.website_url,
            }}
          />
        </section>

        {/* Password */}
        <section className="card-base p-7 mb-6">
          <h2 className="font-bold text-lg mb-1">Password</h2>
          <p className="text-[12.5px] mb-4" style={{ color: "var(--muted)" }}>
            Updates your sign-in password. You won&apos;t be signed out of other devices.
          </p>
          <PasswordForm />
        </section>

        {/* Meta */}
        <section
          className="p-5 text-[12px]"
          style={{ color: "var(--dim)" }}
        >
          <p>Account created: {new Date(organiser.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>User ID: <span className="font-mono">{user.id}</span></p>
        </section>
      </main>
    </>
  );
}
