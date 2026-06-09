"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";

export default function UserMenu({ name, email, isSuperAdmin = false }: { name: string; email: string; isSuperAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-transform hover:scale-105"
        style={{ background: "var(--grad)", color: "#001a10" }}
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 32px rgba(0,0,0,.5)",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="font-medium text-[13px]" style={{ color: "var(--text)" }}>
              {name}
            </div>
            <div className="text-[12px] truncate" style={{ color: "var(--muted)" }}>
              {email}
            </div>
          </div>
          <Link
            href="/dashboard"
            className="block px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(0,255,157,.06)]"
            style={{ color: "var(--text)" }}
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            className="block px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(0,255,157,.06)]"
            style={{ color: "var(--text)" }}
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="block px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-[rgba(255,169,77,.08)]"
              style={{ color: "#ffa94d", borderTop: "1px solid var(--border)" }}
              onClick={() => setOpen(false)}
            >
              ⚡ Super Admin
            </Link>
          )}
          <form action={signOutAction} style={{ borderTop: "1px solid var(--border)" }}>
            <button
              type="submit"
              className="block w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(239,68,68,.08)]"
              style={{ color: "#fca5a5" }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
