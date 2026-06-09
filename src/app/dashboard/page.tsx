import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { listMyEvents } from "@/lib/db/organiser-events";
import { listMyTickets } from "@/lib/db/my-tickets";
import { formatEventDate, categoryIcon } from "@/lib/format";

export const dynamic = "force-dynamic";

const HOSTING_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "DRAFT" },
  published: { bg: "rgba(0,255,157,.15)",   color: "var(--accent)",  label: "PUBLISHED" },
  cancelled: { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",        label: "CANCELLED" },
  completed: { bg: "rgba(0,212,255,.12)",   color: "var(--accent-2)", label: "COMPLETED" },
};

const TICKET_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "PENDING" },
  confirmed:  { bg: "rgba(0,255,157,.15)",   color: "var(--accent)",  label: "CONFIRMED" },
  checked_in: { bg: "rgba(0,212,255,.15)",   color: "var(--accent-2)", label: "CHECKED IN" },
  cancelled:  { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",        label: "CANCELLED" },
};

export default async function DashboardPage() {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  const [hosting, tickets] = await Promise.all([
    listMyEvents(),
    listMyTickets(),
  ]);

  return (
    <>
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-7 py-12">
        <header className="flex items-end justify-between gap-4 flex-wrap mb-10">
          <div>
            <p className="sec-label mb-2">Dashboard</p>
            <h1 className="sec-title">Welcome, {organiser.display_name}</h1>
            <p className="sec-sub mt-2">
              {hosting.length === 0 && tickets.length === 0
                ? "Browse events to attend, or create your own."
                : `${hosting.length} hosting · ${tickets.length} attending`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/events" className="btn-outline" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
              Browse events
            </Link>
            <Link href="/dashboard/events/new" className="btn-grad" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
              + New event
            </Link>
          </div>
        </header>

        {/* ── Hosting ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-bold text-xl">Events I&apos;m hosting</h2>
            {hosting.length > 0 && (
              <span className="text-[12.5px]" style={{ color: "var(--dim)" }}>{hosting.length} total</span>
            )}
          </div>

          {hosting.length === 0 ? (
            <div className="card-base p-8 text-center" style={{ borderStyle: "dashed" }}>
              <div className="text-3xl mb-2 opacity-60">🚀</div>
              <h3 className="font-semibold mb-1.5">Host your first event</h3>
              <p className="text-[13px] mb-4 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                Set up an event page, ticket tiers, and a registration flow in minutes.
              </p>
              <Link href="/dashboard/events/new" className="btn-grad" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
                New event →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {hosting.map((e) => {
                const s = HOSTING_STATUS[e.status];
                return (
                  <Link
                    key={e.id}
                    href={`/dashboard/events/${e.id}`}
                    className="card-base p-5 no-underline flex items-center gap-5"
                    style={{ color: "var(--text)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-md flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,255,157,.15), rgba(0,212,255,.15))",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {categoryIcon(e.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[15.5px] truncate">{e.title}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider shrink-0"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <div className="text-[13px] flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
                        <span>{formatEventDate(e.starts_at, "Asia/Kolkata")}</span>
                        <span>·</span>
                        <span>{e.is_online ? "Online" : (e.venue_name || e.city || "Venue TBA")}</span>
                      </div>
                    </div>
                    <span style={{ color: "var(--muted)" }}>→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Attending ───────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-bold text-xl">Events I&apos;m attending</h2>
            {tickets.length > 0 && (
              <Link href="/my-tickets" className="text-[12.5px]" style={{ color: "var(--accent-3)" }}>
                View all tickets →
              </Link>
            )}
          </div>

          {tickets.length === 0 ? (
            <div className="card-base p-8 text-center" style={{ borderStyle: "dashed" }}>
              <div className="text-3xl mb-2 opacity-60">🎟️</div>
              <h3 className="font-semibold mb-1.5">No tickets yet</h3>
              <p className="text-[13px] mb-4 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                Browse upcoming hackathons, workshops, and meetups across India.
              </p>
              <Link href="/events" className="btn-grad" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
                Browse events →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tickets.slice(0, 5).map((t) => {
                const s = TICKET_STATUS[t.status] ?? TICKET_STATUS.pending;
                const ev = t.events;
                const isPending = t.status === "pending";
                const href = isPending && ev
                  ? `/events/${ev.slug}/register/pending?qr=${encodeURIComponent(t.qr_token)}`
                  : ev
                    ? `/events/${ev.slug}/register/success?qr=${encodeURIComponent(t.qr_token)}`
                    : "#";

                return (
                  <Link
                    key={t.id}
                    href={href}
                    className="card-base p-5 no-underline flex items-center gap-5"
                    style={{ color: "var(--text)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-md flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,212,255,.15), rgba(0,255,157,.15))",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {ev ? categoryIcon(ev.category) : "🎟️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[15.5px] truncate">{ev?.title ?? "Event"}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider shrink-0"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <div className="text-[13px] flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
                        {ev?.starts_at && <span>{formatEventDate(ev.starts_at, ev.timezone)}</span>}
                        {ev && <span>·</span>}
                        <span>{ev ? (ev.is_online ? "Online" : (ev.venue_name || ev.city)) : ""}</span>
                      </div>
                    </div>
                    <span style={{ color: "var(--muted)" }}>{isPending ? "Pay →" : "QR →"}</span>
                  </Link>
                );
              })}
              {tickets.length > 5 && (
                <Link
                  href="/my-tickets"
                  className="text-[13px] text-center py-3"
                  style={{ color: "var(--accent-3)" }}
                >
                  See all {tickets.length} tickets →
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
