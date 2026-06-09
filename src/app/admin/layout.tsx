import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-7 py-3.5 backdrop-blur-xl"
        style={{ background: "rgba(0,0,0,.85)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/admin" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black"
            style={{ background: "linear-gradient(135deg,#ff6b4a,#ffa94d)", color: "#2a0f08" }}
          >
            SA
          </div>
          <span className="font-bold text-[15px]" style={{ color: "var(--text)" }}>
            TechEvent <span style={{ color: "var(--muted)", fontWeight: 400 }}>· Super Admin</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/admin" className="px-3 py-1.5 rounded-md text-[13px] font-medium" style={{ color: "var(--muted)" }}>Overview</Link>
          <Link href="/admin/events" className="px-3 py-1.5 rounded-md text-[13px] font-medium" style={{ color: "var(--muted)" }}>All events</Link>
          <Link href="/" className="px-3 py-1.5 rounded-md text-[13px]" style={{ color: "var(--dim)" }}>↗ Site</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
