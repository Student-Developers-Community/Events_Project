import Link from "next/link";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { getSuperAdminOrNull } from "@/lib/auth/super-admin";
import NavLinks from "./NavLinks";
import UserMenu from "./UserMenu";

export default async function Navbar() {
  const organiser = await getCurrentOrganiser();
  const superAdmin = organiser ? await getSuperAdminOrNull() : null;

  return (
    <nav
      className="sticky top-0 z-[100] flex items-center justify-between px-4 md:px-7 py-3.5 backdrop-blur-xl"
      style={{
        background: "rgba(0,0,0,.85)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{
            background: "var(--grad)",
            color: "#001a10",
            boxShadow: "0 0 24px var(--ring)",
          }}
        >
          TE
        </div>
        <span className="font-bold text-[15px]" style={{ color: "var(--text)" }}>
          TechEvent
        </span>
      </Link>

      <NavLinks isAuthed={!!organiser} />

      <div className="flex items-center gap-2">
        {organiser ? (
          <UserMenu name={organiser.display_name} email={organiser.email} isSuperAdmin={!!superAdmin} />
        ) : (
          <>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-[13.5px]"
              style={{ color: "var(--muted)" }}
            >
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn-grad" style={{ padding: ".5rem 1rem", fontSize: "13.5px" }}>
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
