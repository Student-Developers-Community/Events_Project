import Link from "next/link";
import { ENTITY } from "@/lib/legal";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
  { href: "/shipping", label: "Shipping" },
];

export default function Footer() {
  return (
    <footer
      className="mt-16 py-10 text-center"
      style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
    >
      <div className="mx-auto max-w-[1100px] px-7">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black"
            style={{ background: "var(--grad)", color: "#001a10" }}
          >
            TE
          </div>
          <span className="font-bold text-[13.5px]" style={{ color: "var(--text)" }}>
            {ENTITY.brand}
          </span>
        </div>

        <nav className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mb-4 text-[13px]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} style={{ color: "var(--muted)" }}>{l.label}</Link>
          ))}
        </nav>

        <p className="text-[12.5px]">
          © 2026 {ENTITY.legalName} · {ENTITY.brand} — {ENTITY.lob} for the Indian tech ecosystem.
        </p>
      </div>
    </footer>
  );
}
