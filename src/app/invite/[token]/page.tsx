import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getInvitationByToken } from "@/lib/db/invitations";
import { respondToInvitationAction } from "@/lib/invitations/actions";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getInvitationByToken(token);
  return { title: data ? `Invitation · ${data.event.title}` : "Invitation" };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getInvitationByToken(token);
  if (!data) notFound();

  const { invitation, event, qr_token } = data;
  const where = event.is_online ? "Online event" : [event.venue_name, event.city].filter(Boolean).join(", ") || "Venue TBA";

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-7 py-10">
        <div className="card-base overflow-hidden">
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt="" className="w-full" style={{ height: 200, objectFit: "cover" }} />
          ) : (
            <div style={{ height: 120, background: "linear-gradient(135deg, rgba(124,92,255,.25), rgba(0,212,255,.18))" }} />
          )}

          <div className="p-7">
            <p className="sec-label mb-2">You&apos;re invited</p>
            <h1 className="font-extrabold text-3xl mb-1.5" style={{ letterSpacing: "-0.02em" }}>{event.title}</h1>
            {event.subtitle && <p className="text-[14px] mb-4" style={{ color: "var(--muted)" }}>{event.subtitle}</p>}

            <div className="flex flex-col gap-2 mb-5 text-[13.5px]" style={{ color: "var(--muted)" }}>
              <span className="flex items-center gap-2"><Calendar size={15} strokeWidth={2} /> {formatEventDate(event.starts_at, event.timezone)} → {formatEventDate(event.ends_at, event.timezone)}</span>
              <span className="flex items-center gap-2"><MapPin size={15} strokeWidth={2} /> {event.is_online ? (event.online_url || "Online") : where}</span>
              <span className="text-[12.5px]" style={{ color: "var(--dim)" }}>Hosted by {event.organiser_name} · invited as {invitation.email}</span>
            </div>

            {event.description && (
              <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                {event.description}
              </p>
            )}

            {/* ── State-dependent actions ── */}
            {invitation.status === "invited" && (
              <div className="flex gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <form action={respondToInvitationAction} className="flex-1">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="response" value="accept" />
                  <button type="submit" className="btn-grad w-full" style={{ padding: ".85rem", fontSize: "15px" }}>
                    <Check size={18} strokeWidth={2.4} /> Accept
                  </button>
                </form>
                <form action={respondToInvitationAction} className="flex-1">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="response" value="decline" />
                  <button type="submit" className="btn-outline w-full" style={{ padding: ".85rem", fontSize: "15px" }}>
                    <X size={18} strokeWidth={2.4} /> Decline
                  </button>
                </form>
              </div>
            )}

            {invitation.status === "accepted" && (
              <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="font-semibold mb-3" style={{ color: "var(--accent-3)" }}>✓ You&apos;re going!</p>
                {qr_token ? (
                  <Link href={`/events/${event.slug}/register/success?qr=${encodeURIComponent(qr_token)}`} className="btn-grad" style={{ padding: ".8rem 1.4rem", fontSize: "14px" }}>
                    View your ticket &amp; QR →
                  </Link>
                ) : (
                  <p className="text-[13px]" style={{ color: "var(--muted)" }}>Your ticket will be ready once the organiser sets up tickets.</p>
                )}
              </div>
            )}

            {invitation.status === "declined" && (
              <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="font-semibold" style={{ color: "#fca5a5" }}>You declined this invitation.</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>Changed your mind? Contact the organiser to be re-invited.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
