import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { getEventForAdmin } from "@/lib/admin/data";
import {
  adminUnpublishEventAction, adminDeleteEventAction, adminDeleteRegistrationAction,
} from "@/lib/admin/actions";
import ApprovalControls from "@/components/admin/ApprovalControls";
import { formatEventDate, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "rgba(255,255,255,.06)", color: "var(--muted)" },
  confirmed:  { bg: "rgba(124, 92, 255,.15)",   color: "var(--accent)" },
  checked_in: { bg: "rgba(0,212,255,.15)",   color: "var(--accent-2)" },
  cancelled:  { bg: "rgba(239,68,68,.12)",   color: "#fca5a5" },
};

export default async function AdminEventDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const data = await getEventForAdmin(id);
  if (!data) notFound();

  const { event, organiser, tiers, registrations, insights } = data;
  const isLive = event.status === "published" && event.approval_status === "approved";
  const questions = Array.isArray(event.questions) ? event.questions : [];
  const location = event.is_online
    ? (event.online_url || "Online")
    : [event.venue_name, event.venue_address, event.city].filter(Boolean).join(", ") || "—";

  return (
    <main className="max-w-[1100px] mx-auto px-7 py-10">
      <Link href="/admin/events" className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
        ← All events
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
            style={{ background: event.approval_status === "approved" ? "rgba(124, 92, 255,.15)" : event.approval_status === "rejected" ? "rgba(239,68,68,.12)" : "rgba(251,191,36,.15)",
                     color: event.approval_status === "approved" ? "var(--accent)" : event.approval_status === "rejected" ? "#fca5a5" : "#fbbf24" }}>
            {event.approval_status}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded uppercase" style={{ background: "var(--bg-2)", color: "var(--dim)" }}>{event.status}</span>
        </div>
        <h1 className="font-extrabold text-3xl mb-1" style={{ letterSpacing: "-0.02em" }}>{event.title}</h1>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          {formatEventDate(event.starts_at)} · {event.is_online ? "Online" : (event.venue_name || event.city || "—")} · by {organiser?.display_name} ({organiser?.email})
        </p>
      </header>

      {/* Approve / reject if pending */}
      {event.approval_status === "pending" && (
        <div className="card-base p-5 mb-6" style={{ background: "rgba(251,191,36,.05)", borderColor: "rgba(251,191,36,.25)" }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: "#fbbf24" }}>⏳ Awaiting your approval</p>
          <ApprovalControls eventId={event.id} />
        </div>
      )}
      {event.approval_status === "rejected" && event.rejection_reason && (
        <div className="card-base p-4 mb-6" style={{ background: "rgba(239,68,68,.05)", borderColor: "rgba(239,68,68,.25)" }}>
          <p className="text-[12px]" style={{ color: "#fca5a5" }}>Rejected: {event.rejection_reason}</p>
          <div className="mt-3"><ApprovalControls eventId={event.id} /></div>
        </div>
      )}

      {/* ── Review: everything the organiser submitted ── */}
      <section className="card-base p-6 mb-8">
        <h2 className="font-bold text-lg mb-4">Review details</h2>

        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt="Event cover"
            className="w-full rounded-lg mb-5"
            style={{ maxHeight: 220, objectFit: "cover", border: "1px solid var(--border)" }}
          />
        )}

        {event.subtitle && (
          <p className="text-[15px] mb-3" style={{ color: "var(--text)" }}>{event.subtitle}</p>
        )}

        {/* Key facts */}
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-5">
          <Fact label="Category" value={String(event.category).replace("_", " ")} />
          <Fact label="When" value={`${formatEventDate(event.starts_at, event.timezone)} → ${formatEventDate(event.ends_at, event.timezone)}`} />
          <Fact label={event.is_online ? "Online link" : "Venue"} value={location} />
          <Fact label="Capacity" value={event.total_capacity ? `${event.total_capacity}` : "Unlimited"} />
          <Fact label="Contact email" value={event.contact_email || "—"} />
          <Fact label="Contact phone" value={event.contact_phone || "—"} />
        </div>

        {/* Description */}
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--dim)" }}>Description</p>
          {event.description ? (
            <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {event.description}
            </p>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--dim)" }}>No description provided.</p>
          )}
        </div>

        {/* Ticket tiers / pricing */}
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--dim)" }}>Ticket tiers</p>
          {tiers.length === 0 ? (
            <p className="text-[13px]" style={{ color: "#fbbf24" }}>⚠ No ticket tiers — attendees can’t register.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tiers.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-md" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <span className="font-semibold text-[14px] flex-1">{t.name}{!t.is_active && <span className="ml-2 text-[10px]" style={{ color: "var(--dim)" }}>INACTIVE</span>}</span>
                  <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>{t.capacity ? `${t.sold_count}/${t.capacity}` : `${t.sold_count} sold`}</span>
                  <span className="font-bold text-[14px]" style={{ color: t.price_paise === 0 ? "#86efac" : "var(--accent)" }}>{formatINR(t.price_paise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom registration questions */}
        <div>
          <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--dim)" }}>Custom questions</p>
          {questions.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--dim)" }}>None — only name, email, phone collected.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {questions.map((q: { id: string; label: string; type: string; required: boolean }) => (
                <span key={q.id} className="px-2.5 py-1 rounded-full text-[12px]" style={{ background: "rgba(124,92,255,.1)", border: "1px solid rgba(124,92,255,.22)", color: "var(--accent-3)" }}>
                  {q.label} <span style={{ color: "var(--dim)" }}>· {q.type}{q.required ? " · required" : ""}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Registered", value: insights.registered, accent: "var(--accent-3)" },
          { label: "Confirmed", value: insights.confirmed, accent: "var(--accent)" },
          { label: "Checked in", value: insights.checked_in, accent: "var(--accent-2)" },
          { label: "Revenue", value: formatINR(insights.revenue_paise), accent: "#fbbf24" },
        ].map((c) => (
          <div key={c.label} className="card-base p-5">
            <p className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--dim)" }}>{c.label}</p>
            <p className="font-extrabold text-2xl" style={{ color: c.accent }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Event-level actions */}
      <div className="flex gap-2 flex-wrap mb-9">
        <Link href={`/admin/events/${event.id}/edit`} className="btn-outline" style={{ padding: ".55rem 1.1rem", fontSize: "13px" }}>
          ✏️ Edit event
        </Link>
        {isLive && (
          <Link href={`/events/${event.slug}`} target="_blank" className="btn-outline" style={{ padding: ".55rem 1.1rem", fontSize: "13px" }}>
            View public page ↗
          </Link>
        )}
        {event.status === "published" && (
          <form action={adminUnpublishEventAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <button type="submit" className="btn-outline" style={{ padding: ".55rem 1.1rem", fontSize: "13px" }}>Take offline</button>
          </form>
        )}
        <form action={adminDeleteEventAction}>
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="btn-outline" style={{ padding: ".55rem 1.1rem", fontSize: "13px", color: "#fca5a5", borderColor: "rgba(239,68,68,.3)" }}>
            Delete event
          </button>
        </form>
      </div>

      {/* Registrations */}
      <section>
        <h2 className="font-bold text-xl mb-4">Registrations ({registrations.length})</h2>
        {registrations.length === 0 ? (
          <div className="card-base p-8 text-center" style={{ borderStyle: "dashed" }}>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>No registrations yet.</p>
          </div>
        ) : (
          <div className="card-base overflow-x-auto" style={{ padding: 0 }}>
            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Name", "Email", "Phone", "Status", "Amount", ""].map((h, i) => (
                    <th key={h} className="px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--dim)", textAlign: i === 4 ? "right" : "left", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const s = STATUS_PILL[r.status] ?? STATUS_PILL.pending;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2.5">{r.attendee_name}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--muted)", wordBreak: "break-all" }}>{r.attendee_email}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{r.attendee_phone ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: s.bg, color: s.color }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{ color: "var(--accent)" }}>{formatINR(r.amount_paise)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <form action={adminDeleteRegistrationAction}>
                          <input type="hidden" name="registration_id" value={r.id} />
                          <input type="hidden" name="event_id" value={event.id} />
                          <button type="submit" className="text-[11px] px-2 py-1 rounded" style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,.2)" }}>
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-[13.5px]" style={{ color: "var(--text)", wordBreak: "break-word" }}>{value}</p>
    </div>
  );
}
