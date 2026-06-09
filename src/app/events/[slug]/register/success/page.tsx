import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateQRDataUrl } from "@/lib/qr";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ticket confirmed · TechEvent" };

export default async function RegisterSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qr?: string; err?: string }>;
}) {
  const { slug } = await params;
  const { qr, err } = await searchParams;
  if (!qr) notFound();

  const sb = await getSupabaseServerClient();
  if (!sb) notFound();

  // Join registration to event
  const { data: reg } = await sb
    .from("registrations")
    .select(`
      id, attendee_name, attendee_email, status,
      events ( title, starts_at, timezone, venue_name, city, is_online )
    `)
    .eq("qr_token", qr)
    .maybeSingle();

  const event = Array.isArray(reg?.events) ? reg.events[0] : reg?.events;
  const qrDataUrl = await generateQRDataUrl(qr);

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-7 py-12">
        {err ? (
          <div
            className="card-base p-7 mb-6"
            style={{ borderColor: "rgba(239,68,68,.3)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#fca5a5" }}>Couldn&apos;t confirm</p>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Something went wrong. Try the link again or contact the organiser.
            </p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(0,255,157,.12)",
                border: "1px solid rgba(0,255,157,.3)",
                color: "var(--accent-3)",
              }}
            >
              <span className="pulse" />
              CONFIRMED · Ticket ready
            </div>
          </div>
        )}

        <div className="card-base p-8">
          <header className="mb-6">
            <h1 className="font-extrabold text-2xl mb-1.5" style={{ letterSpacing: "-0.01em" }}>
              {event?.title ?? "Your event"}
            </h1>
            <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
              {event?.starts_at && formatEventDate(event.starts_at, event.timezone ?? "Asia/Kolkata")}
              {event && " · "}
              {event?.is_online ? "Online" : (event?.venue_name || event?.city)}
            </p>
          </header>

          {/* QR */}
          <div
            className="flex items-center justify-center p-6 rounded-lg mb-6"
            style={{
              background: "#000",
              border: "1px solid var(--border)",
              boxShadow: "0 0 32px rgba(0,255,157,.08)",
            }}
          >
            <Image
              src={qrDataUrl}
              alt="Your entry QR code"
              width={280}
              height={280}
              unoptimized
              style={{ borderRadius: "8px" }}
            />
          </div>

          {/* Attendee */}
          {reg && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg mb-4"
              style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: "var(--grad)", color: "#001a10" }}
              >
                {reg.attendee_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] truncate">{reg.attendee_name}</p>
                <p className="text-[12px] truncate" style={{ color: "var(--muted)" }}>{reg.attendee_email}</p>
              </div>
            </div>
          )}

          <ul className="text-[12.5px] list-disc list-inside flex flex-col gap-1 mb-5" style={{ color: "var(--muted)" }}>
            <li>Save this page — or check your email for the same QR.</li>
            <li>Show this QR at the door for entry.</li>
            <li>Each QR is single-use. Don&apos;t share it.</li>
          </ul>

          {/* Add to calendar — downloads .ics (works with Google/Apple/Outlook) */}
          <a
            href={`/api/calendar/${encodeURIComponent(qr)}`}
            className="btn-outline w-full text-center mb-3 inline-flex items-center justify-center gap-2"
            style={{ padding: ".7rem 1.2rem", fontSize: "13.5px" }}
          >
            📅 Add to calendar
          </a>

          <div className="flex gap-2">
            <Link href={`/events/${slug}`} className="btn-outline flex-1 text-center" style={{ padding: ".7rem 1.2rem", fontSize: "13.5px" }}>
              Back to event
            </Link>
            <Link href="/my-tickets" className="btn-grad flex-1 text-center" style={{ padding: ".7rem 1.2rem", fontSize: "13.5px" }}>
              All my tickets
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
