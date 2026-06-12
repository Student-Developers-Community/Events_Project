import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/auth/session";
import { listMyTickets } from "@/lib/db/my-tickets";
import { formatEventDate, formatINR, categoryIcon } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My tickets · TechEvent" };

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "PENDING PAYMENT" },
  confirmed:   { bg: "rgba(124, 92, 255,.15)",   color: "var(--accent)",  label: "CONFIRMED" },
  checked_in:  { bg: "rgba(0,212,255,.15)",   color: "var(--accent-2)", label: "CHECKED IN" },
  cancelled:   { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",        label: "CANCELLED" },
  refunded:    { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "REFUNDED" },
  no_show:     { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "NO SHOW" },
};

export default async function MyTicketsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/my-tickets");

  const tickets = await listMyTickets();

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-7 py-12">
        <header className="mb-9">
          <p className="sec-label mb-2">Account</p>
          <h1 className="sec-title">My tickets</h1>
          <p className="sec-sub mt-2">
            {tickets.length === 0
              ? "You haven't registered for any events yet."
              : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}.`}
          </p>
        </header>

        {tickets.length === 0 ? (
          <div className="card-base p-12 text-center" style={{ borderStyle: "dashed" }}>
            <div className="text-5xl mb-4 opacity-60">🎟️</div>
            <h2 className="font-bold text-xl mb-2">No tickets yet</h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
              Browse Discover and register for something you&apos;ll love.
            </p>
            <Link href="/events" className="btn-grad" style={{ padding: ".7rem 1.4rem", fontSize: "14px" }}>
              Browse events →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((t) => {
              const s = STATUS[t.status] ?? STATUS.pending;
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
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(124, 92, 255,.15), rgba(0,212,255,.15))",
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

                  <div className="text-right shrink-0">
                    <p className="font-bold text-[14px]">{formatINR(t.amount_paise)}</p>
                    <p className="text-[11px]" style={{ color: "var(--dim)" }}>
                      {isPending ? "Pay to confirm →" : "View QR →"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
