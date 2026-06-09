import Link from "next/link";

export const metadata = { title: "Access denied · TechEvent" };

export default function DeniedPage() {
  return (
    <main className="max-w-md mx-auto px-7 py-24 text-center">
      <div className="text-5xl mb-4 opacity-70">🔒</div>
      <h1 className="font-bold text-2xl mb-2">Super-admin only</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Your account isn&apos;t a platform super-admin. If you believe this is a mistake,
        ask the platform owner to add your email to the allowlist.
      </p>
      <Link href="/" className="btn-grad" style={{ padding: ".7rem 1.4rem", fontSize: "14px" }}>
        Back to site
      </Link>
    </main>
  );
}
