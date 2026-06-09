import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { getPlatformStats, listEventsForAdmin } from "@/lib/admin/data";
import ApprovalControls from "@/components/admin/ApprovalControls";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Super Admin · TechEvent" };

export default async function AdminOverviewPage() {
  await requireSuperAdmin();
  const [stats, pending] = await Promise.all([
    getPlatformStats(),
    listEventsForAdmin("pending"),
  ]);

  const cards = [
    { label: "Pending approval", value: stats.pending, accent: "#fbbf24" },
    { label: "Live events", value: stats.live, accent: "var(--accent)" },
    { label: "Total events", value: stats.total_events, accent: "var(--accent-2)" },
    { label: "Registrations", value: stats.total_registrations, accent: "var(--accent-3)" },
  ];

  return (
    <main className="max-w-[1100px] mx-auto px-7 py-10">
      <header className="mb-8">
        <p className="sec-label mb-2" style={{ color: "#ffa94d" }}>Platform overview</p>
        <h1 className="sec-title">Super Admin</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="card-base p-5">
            <p className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--dim)" }}>{c.label}</p>
            <p className="font-extrabold text-3xl" style={{ color: c.accent }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Pending approval queue */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-bold text-xl">Pending approval</h2>
          <Link href="/admin/events" className="text-[13px]" style={{ color: "var(--accent-3)" }}>All events →</Link>
        </div>

        {pending.length === 0 ? (
          <div className="card-base p-10 text-center" style={{ borderStyle: "dashed" }}>
            <div className="text-4xl mb-3 opacity-60">✅</div>
            <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>Nothing waiting. The queue is clear.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((e) => (
              <div key={e.id} className="card-base p-5 flex items-start gap-5 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link href={`/admin/events/${e.id}`} className="font-semibold text-[15.5px]" style={{ color: "var(--text)" }}>
                      {e.title}
                    </Link>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: "var(--bg-2)", color: "var(--muted)" }}>
                      {e.category.replace("_", " ")}
                    </span>
                    {e.status !== "published" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,.06)", color: "var(--dim)" }}>
                        draft (not submitted)
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
                    <span>{formatEventDate(e.starts_at)}</span>
                    <span>·</span>
                    <span>{e.is_online ? "Online" : (e.city || "—")}</span>
                    <span>·</span>
                    <span>by {e.organiser_name} ({e.organiser_email})</span>
                  </div>
                </div>
                <ApprovalControls eventId={e.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
