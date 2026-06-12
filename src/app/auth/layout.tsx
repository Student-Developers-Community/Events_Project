import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 0%, rgba(124, 92, 255,.1), transparent 70%), radial-gradient(ellipse 40% 40% at 30% 100%, rgba(0,212,255,.08), transparent 70%)",
        }}
      />

      <Link href="/" className="relative z-10 flex items-center gap-2.5 no-underline mb-8">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-black"
          style={{
            background: "var(--grad)",
            color: "#001a10",
            boxShadow: "0 0 32px var(--ring)",
          }}
        >
          TE
        </div>
        <span className="font-bold text-base" style={{ color: "var(--text)" }}>
          TechEvent
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}
