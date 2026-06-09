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
  confirmed:  { bg: "rgba(0,255,157,.15)",   color: "var(--accent)" },
  checked_in: { bg: "rgba(0,212,255,.15)",   color: "var(--accent-2)" },
  cancelled:  { bg: "rgba(239,68,68,.12)",   color: "#fca5a5" },
};

export default async function AdminEventDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const data = await getEventForAdmin(id);
  if (!data) notFound();

  const { event, organiser, registrations, insights } = data;

  return (
    <main className="max-w-[1100px] mx-auto px-7 py-10">
      <Link href="/admin/events" className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
        ← All events
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
            style={{ background: event.approval_status === "approved" ? "rgba(0,255,157,.15)" : event.approval_status === "rejected" ? "rgba(239,68,68,.12)" : "rgba(251,191,36,.15)",
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
        <Link href={`/events/${event.slug}`} target="_blank" className="btn-outline" style={{ padding: ".55rem 1.1rem", fontSize: "13px" }}>
          View public page ↗
        </Link>
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
