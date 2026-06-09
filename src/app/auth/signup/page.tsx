import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import GoogleButton from "@/components/auth/GoogleButton";
import { signupAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Create account · TechEvent" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/dashboard");

  const loginHref = next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login";
  const isForRegistration = next?.includes("/register");

  return (
    <div className="card-base p-7">
      <header className="mb-6">
        <h1 className="font-bold text-2xl mb-1.5" style={{ letterSpacing: "-0.01em" }}>
          {isForRegistration ? "Create your account" : "Host your first event"}
        </h1>
        <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
          {isForRegistration
            ? "Sign up to register for this event. Takes 30 seconds."
            : "Create an account in 30 seconds. Host or attend any event on TechEvent."}
        </p>
      </header>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 my-5">
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--dim)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <AuthForm
        action={signupAction}
        submitLabel="Create account"
        next={next}
        fields={[
          { name: "display_name", type: "text", label: "Your name", autoComplete: "name", placeholder: "Pavan Kumar" },
          { name: "email", type: "email", label: "Email", autoComplete: "email", placeholder: "you@example.com" },
          { name: "password", type: "password", label: "Password", autoComplete: "new-password", placeholder: "At least 8 characters" },
        ]}
      />

      <p className="mt-5 text-[13px] text-center" style={{ color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href={loginHref} style={{ color: "var(--accent-3)" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
