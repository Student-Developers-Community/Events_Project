"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname();

  const items = isAuthed
    ? [
        { href: "/events",    label: "Discover" },
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/events",     label: "Discover" },
        { href: "/organisers", label: "For Organisers" },
        { href: "/pricing",    label: "Pricing" },
      ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="block px-3.5 py-1.5 rounded-md text-[13.5px] font-medium transition-colors"
            style={{
              color: isActive(item.href) ? "var(--text)" : "var(--muted)",
              background: isActive(item.href) ? "rgba(124, 92, 255,.1)" : "transparent",
              border: isActive(item.href) ? "1px solid rgba(124, 92, 255,.25)" : "1px solid transparent",
            }}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
