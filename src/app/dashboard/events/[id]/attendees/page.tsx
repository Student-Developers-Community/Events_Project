import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { getMyEventById } from "@/lib/db/organiser-events";
import { listEventAttendees, type AttendeeRow } from "@/lib/db/event-attendees";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { key: "all",        label: "All" },
  { key: "confirmed",  label: "Confirmed" },
  { key: "checked_in", label: "Checked in" },
  { key: "pending",    label: "Pending" },
  { key: "cancelled",  label: "Cancelled" },
] as const;

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: "rgba(255,255,255,.06)", color: "var(--muted)",    label: "PENDING" },
  confirmed:  { bg: "rgba(124, 92, 255,.15)",   color: "var(--accent)",   label: "CONFIRMED" },
  checked_in: { bg: "rgba(0,212,255,.15)",   color: "var(--accent-2)", label: "CHECKED IN" },
  cancelled:  { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",         label: "CANCELLED" },
  refunded:   { bg: "rgba(255,255,255,.06)", color: "var(--muted)",    label: "REFUNDED" },
  no_show:    { bg: "rgba(255,255,255,.06)", color: "var(--muted)",    label: "NO SHOW" },
};

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  const { id } = await params;
  const sp = await searchParams;
  const ev = await getMyEventById(id);
  if (!ev) notFound();

  const status = (sp.status ?? "all") as (typeof STATUS_FILTERS)[number]["key"];
  const q = sp.q ?? "";

  const rows = await listEventAttendees(id, { status, q });

  const exportQs = new URLSearchParams();
  if (status && status !== "all") exportQs.set("status", status);
  if (q) exportQs.set("q", q);
  const exportHref = `/dashboard/events/${id}/attendees/export?${exportQs.toString()}`;

  return (
    <>
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-7 py-10">
        <Link href={`/dashboard/events/${id}`} className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to event
        </Link>

        <header className="flex items-end justify-between gap-4 flex-wrap mb-7">
          <div>
            <p className="sec-label mb-2">Attendees</p>
            <h1 className="font-extrabold text-3xl" style={{ letterSpacing: "-0.02em" }}>
              {ev.event.title}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
              {rows.length} {rows.length === 1 ? "result" : "results"}
              {status !== "all" ? ` · status: ${status}` : ""}
              {q ? ` · matching "${q}"` : ""}
            </p>
          </div>
          <a href={exportHref} className="btn-grad" style={{ padding: ".65rem 1.2rem", fontSize: "13.5px" }}>
            ⬇ Export CSV
          </a>
        </header>

        {/* Filters */}
        <form className="flex gap-2 flex-wrap mb-5 items-center" method="get">
          {STATUS_FILTERS.map((f) => {
            const active = (sp.status ?? "all") === f.key;
            return (
              <Link
                key={f.key}
                href={`/dashboard/events/${id}/attendees${f.key === "all" ? "" : `?status=${f.key}`}${q ? `${f.key === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`}
                className="px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors"
                style={{
                  color: active ? "#001a10" : "var(--muted)",
                  background: active ? "var(--accent)" : "transparent",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                {f.label}
              </Link>
            );
          })}
          <div className="flex-1" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="px-3 py-1.5 rounded-md text-[13px] outline-none"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              minWidth: 220,
            }}
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn-outline" style={{ padding: ".4rem .9rem", fontSize: "12.5px" }}>
            Search
          </button>
        </form>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="card-base p-12 text-center" style={{ borderStyle: "dashed" }}>
            <div className="text-4xl mb-3 opacity-60">📭</div>
            <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
              No attendees match that filter.
            </p>
          </div>
        ) : (
          <div className="card-base overflow-hidden" style={{ padding: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Tier</Th>
                    <Th>Status</Th>
                    <Th right>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <Row key={r.id} row={r} alt={i % 2 === 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className="px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold"
      style={{
        color: "var(--dim)",
        textAlign: right ? "right" : "left",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function Row({ row, alt }: { row: AttendeeRow; alt: boolean }) {
  const s = STATUS_PILL[row.status] ?? STATUS_PILL.pending;
  return (
    <tr style={{ background: alt ? "rgba(255,255,255,.015)" : "transparent" }}>
      <Td>
        <div className="font-medium" style={{ color: "var(--text)" }}>
          {row.attendee_name}
        </div>
        {row.answers.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {row.answers.map((a) => (
              <div key={a.id} className="text-[11.5px]" style={{ color: "var(--dim)" }}>
                <span style={{ color: "var(--muted)" }}>{a.label}:</span>{" "}
                {a.type === "url" ? (
                  <a href={a.value} target="_blank" rel="noreferrer" style={{ color: "var(--accent-3)", wordBreak: "break-all" }}>
                    {a.value}
                  </a>
                ) : (
                  <span style={{ wordBreak: "break-word" }}>{a.value}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Td>
      <Td muted><span style={{ wordBreak: "break-all" }}>{row.attendee_email}</span></Td>
      <Td muted>{row.attendee_phone ?? "—"}</Td>
      <Td muted>{row.ticket_tiers?.name ?? "—"}</Td>
      <Td>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </Td>
      <Td right>
        <span className="font-semibold" style={{ color: row.amount_paise === 0 ? "#86efac" : "var(--accent)" }}>
          {formatINR(row.amount_paise)}
        </span>
      </Td>
    </tr>
  );
}

function Td({ children, muted, right }: { children: React.ReactNode; muted?: boolean; right?: boolean }) {
  return (
    <td
      className="px-3 py-3"
      style={{
        color: muted ? "var(--muted)" : "var(--text)",
        textAlign: right ? "right" : "left",
        borderBottom: "1px solid var(--border)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}
