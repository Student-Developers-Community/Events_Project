import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { listEventsForAdmin } from "@/lib/admin/data";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "All events · Super Admin" };

const APPROVAL_PILL: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "rgba(251,191,36,.15)", color: "#fbbf24" },
  approved: { bg: "rgba(124, 92, 255,.15)",  color: "var(--accent)" },
  rejected: { bg: "rgba(239,68,68,.12)",  color: "#fca5a5" },
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: "pending" | "live" | "all" }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const events = await listEventsForAdmin(filter);

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "live", label: "Live" },
  ] as const;

  return (
    <main className="max-w-[1100px] mx-auto px-7 py-10">
      <header className="mb-6">
        <p className="sec-label mb-2" style={{ color: "#ffa94d" }}>All events</p>
        <h1 className="sec-title">Every event on the platform</h1>
      </header>

      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/events${f.key === "all" ? "" : `?filter=${f.key}`}`}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium"
            style={{
              color: filter === f.key ? "#001a10" : "var(--muted)",
              background: filter === f.key ? "var(--accent)" : "transparent",
              border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="card-base p-10 text-center" style={{ borderStyle: "dashed" }}>
          <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>No events match.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((e) => {
            const ap = APPROVAL_PILL[e.approval_status] ?? APPROVAL_PILL.pending;
            return (
              <Link
                key={e.id}
                href={`/admin/events/${e.id}`}
                className="card-base p-4 flex items-center gap-4 no-underline"
                style={{ color: "var(--text)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-[14.5px] truncate">{e.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase" style={{ background: ap.bg, color: ap.color }}>
                      {e.approval_status}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ background: "var(--bg-2)", color: "var(--dim)" }}>
                      {e.status}
                    </span>
                  </div>
                  <div className="text-[12px] flex gap-2.5 flex-wrap" style={{ color: "var(--muted)" }}>
                    <span>{formatEventDate(e.starts_at)}</span><span>·</span>
                    <span>{e.organiser_name}</span><span>·</span>
                    <span>{e.registrations} regs</span>
                  </div>
                </div>
                <span style={{ color: "var(--muted)" }}>→</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
