import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import TierAddForm from "@/components/dashboard/TierAddForm";
import PublishToggle from "@/components/dashboard/PublishToggle";
import GuestList from "@/components/dashboard/GuestList";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { getMyEventById } from "@/lib/db/organiser-events";
import { listEventInvitations } from "@/lib/db/invitations";
import { formatEventDate, formatINR } from "@/lib/format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: "rgba(255,255,255,.06)", color: "var(--muted)",  label: "DRAFT" },
  published: { bg: "rgba(124, 92, 255,.15)",   color: "var(--accent)", label: "PUBLISHED" },
  cancelled: { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",       label: "CANCELLED" },
  completed: { bg: "rgba(0,212,255,.12)",   color: "var(--accent-2)", label: "COMPLETED" },
};

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  const { id } = await params;
  const data = await getMyEventById(id);
  if (!data) notFound();

  const invitations = await listEventInvitations(id);

  const { event, tiers, attendee_count } = data;
  const s = STATUS_STYLE[event.status];
  const isPublished = event.status === "published";
  const ended = new Date(event.ends_at).getTime() < Date.now();

  // Approval banner state
  const approval = event.approval_status; // 'pending' | 'approved' | 'rejected'
  const isLive = isPublished && approval === "approved";

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-7 py-12">
        <Link href="/dashboard" className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label}
            </span>
            <span className="text-[12px] uppercase tracking-wider" style={{ color: "var(--dim)" }}>
              {event.category.replace("_", " ")}
            </span>
          </div>
          <h1 className="font-extrabold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>{event.title}</h1>
          {event.subtitle && (
            <p className="text-base mb-3" style={{ color: "var(--muted)" }}>{event.subtitle}</p>
          )}
          <div className="text-[13.5px] flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
            <span>📅 {formatEventDate(event.starts_at)}</span>
            <span>·</span>
            <span>📍 {event.is_online ? "Online" : (event.venue_name || event.city || "Venue TBA")}</span>
            {event.total_capacity && (<><span>·</span><span>👥 {event.total_capacity} max</span></>)}
          </div>
        </header>

        {/* Ended banner */}
        {ended && (
          <div className="card-base p-4 mb-5" style={{ background: "rgba(124,92,255,.06)", borderColor: "rgba(124,92,255,.25)" }}>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--accent-3)" }}>📅 This event has ended</p>
            <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>
              It&apos;s a past event — registration is closed and it no longer appears on Discover. To run it again,
              <Link href={`/dashboard/events/${event.id}/edit`} style={{ color: "var(--accent-2)" }}> edit the date</Link> to a future one; it&apos;ll go back for approval, then re-open for registration.
            </p>
          </div>
        )}

        {/* Approval banner */}
        {isPublished && approval === "pending" && (
          <div className="card-base p-4 mb-5" style={{ background: "rgba(251,191,36,.05)", borderColor: "rgba(251,191,36,.25)" }}>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#fbbf24" }}>⏳ Pending super-admin approval</p>
            <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>
              Submitted for review. It&apos;s not publicly visible yet — you&apos;ll see it go live once approved.
            </p>
          </div>
        )}
        {approval === "rejected" && (
          <div className="card-base p-4 mb-5" style={{ background: "rgba(239,68,68,.05)", borderColor: "rgba(239,68,68,.25)" }}>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#fca5a5" }}>Rejected by super-admin</p>
            <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>
              {event.rejection_reason || "No reason given."} Fix the issues and re-submit (publish again).
            </p>
          </div>
        )}
        {isLive && (
          <div className="card-base p-3 mb-5" style={{ background: "rgba(124, 92, 255,.05)", borderColor: "rgba(124, 92, 255,.2)" }}>
            <p className="text-[12.5px]" style={{ color: "var(--accent-3)" }}>✓ Approved &amp; live — visible on Discover.</p>
          </div>
        )}

        {/* Action bar */}
        <div className="card-base p-5 mb-7 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-[12px] uppercase tracking-wider mb-1" style={{ color: "var(--dim)" }}>Attendees</p>
            <p className="font-bold text-2xl">{attendee_count}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isLive && (
              <Link href={`/events/${event.slug}`} target="_blank" className="btn-outline" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
                View public page ↗
              </Link>
            )}
            <Link
              href={`/dashboard/events/${event.id}/edit`}
              className="btn-outline"
              style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}
            >
              ✏️ Edit
            </Link>
            <Link
              href={`/dashboard/events/${event.id}/attendees`}
              className="btn-outline"
              style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}
            >
              👥 Attendees
            </Link>
            <Link
              href={`/dashboard/events/${event.id}/checkin`}
              className="btn-outline"
              style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}
              title="Open the door scanner for this event"
            >
              📷 Door scanner
            </Link>
            <PublishToggle eventId={event.id} isPublished={isPublished} hasTiers={tiers.length > 0} isApproved={approval === "approved"} />
          </div>
        </div>


        {/* Tiers */}
        <section className="mb-9">
          <h2 className="sec-title text-2xl mb-2">Ticket tiers</h2>
          <p className="text-[13.5px] mb-5" style={{ color: "var(--muted)" }}>
            Add at least one tier before publishing. ₹0 tiers are free RSVPs.
          </p>

          {tiers.length > 0 && (
            <div className="flex flex-col gap-2 mb-6">
              {tiers.map((t) => (
                <div key={t.id} className="card-base p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[15px]">{t.name}</h3>
                      {!t.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-2)", color: "var(--muted)" }}>INACTIVE</span>
                      )}
                    </div>
                    <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                      {t.capacity ? `${t.sold_count}/${t.capacity} sold` : `${t.sold_count} sold · unlimited`}
                      {t.description && ` · ${t.description}`}
                    </div>
                  </div>
                  <div
                    className="font-bold text-[15px] px-3 py-1 rounded-full"
                    style={{
                      background: t.price_paise === 0 ? "rgba(22,163,74,.15)" : "rgba(124, 92, 255,.1)",
                      color: t.price_paise === 0 ? "#86efac" : "var(--accent)",
                    }}
                  >
                    {formatINR(t.price_paise)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card-base p-5">
            <h3 className="font-semibold text-[14px] mb-3">Add a tier</h3>
            <TierAddForm eventId={event.id} />
          </div>
        </section>

        {/* Guest invitations */}
        <GuestList eventId={event.id} invitations={invitations} appUrl={APP_URL} />
      </main>
    </>
  );
}
