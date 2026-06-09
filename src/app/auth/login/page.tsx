import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import GoogleButton from "@/components/auth/GoogleButton";
import { loginAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in · TechEvent" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/dashboard");

  const signupHref = next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup";

  return (
    <div className="card-base p-7">
      <header className="mb-6">
        <h1 className="font-bold text-2xl mb-1.5" style={{ letterSpacing: "-0.01em" }}>
          Welcome back
        </h1>
        <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
          {next?.includes("/register")
            ? "Sign in to register for this event."
            : "Sign in to manage your events."}
        </p>
      </header>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 my-5">
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--dim)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <AuthForm
        action={loginAction}
        submitLabel="Sign in"
        next={next}
        fields={[
          { name: "email", type: "email", label: "Email", autoComplete: "email", placeholder: "you@example.com" },
          { name: "password", type: "password", label: "Password", autoComplete: "current-password", placeholder: "••••••••" },
        ]}
      />

      <p className="mt-5 text-[13px] text-center" style={{ color: "var(--muted)" }}>
        New to TechEvent?{" "}
        <Link href={signupHref} style={{ color: "var(--accent-3)" }}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
