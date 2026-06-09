import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { confirmWithoutPaymentAction } from "@/lib/registrations/actions";
import { formatINR, formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm registration · TechEvent" };

/**
 * Step 2 of registration: pending screen.
 * Looks up the pending registration by qr_token (from the URL after step 1).
 * Shows two actions:
 *   · Continue payment (Razorpay — stub for now)
 *   · Skip & Get QR (dev shortcut, confirms without payment)
 */
export default async function PendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qr?: string }>;
}) {
  const { slug } = await params;
  const { qr } = await searchParams;
  if (!qr) notFound();

  const sb = await getSupabaseServerClient();
  if (!sb) notFound();

  // Read the pending registration. Since RLS doesn't expose pending regs to
  // anon users by default, we rely on the user just having submitted it
  // (same-session cookie). For guest checkout we'll switch to service_role.
  const { data: reg } = await sb
    .from("registrations")
    .select("id, status, attendee_name, attendee_email, amount_paise, event_id")
    .eq("qr_token", qr)
    .maybeSingle();

  // If the row is invisible due to RLS (anon + status pending) we still
  // render the screen — the qr_token in URL is proof enough at this stage.
  const amountPaise = reg?.amount_paise ?? null;
  const status = reg?.status ?? "pending";

  // If already confirmed, send them straight to success
  if (status !== "pending") {
    return (
      <>
        <Navbar />
        <main className="max-w-xl mx-auto px-7 py-16 text-center">
          <p className="mb-4">Your registration is already confirmed.</p>
          <Link href={`/events/${slug}/register/success?qr=${encodeURIComponent(qr)}`} className="btn-grad">
            View ticket
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-7 py-12">
        <div className="card-base p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="pulse" />
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-3)" }}>
              Step 2 of 2 · Pending payment
            </span>
          </div>

          <h1 className="font-extrabold text-2xl mb-2" style={{ letterSpacing: "-0.01em" }}>
            Almost there
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "var(--muted)" }}>
            We&apos;ve reserved your seat. Complete payment to confirm — or skip for now and grab your QR.
          </p>

          {amountPaise !== null && (
            <div
              className="flex items-center justify-between p-4 rounded-lg mb-6"
              style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--dim)" }}>Amount due</p>
                <p className="font-extrabold text-2xl gtext">{formatINR(amountPaise)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--dim)" }}>Status</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--muted)" }}>Awaiting payment</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Continue payment — stub for now */}
            <button
              type="button"
              disabled
              className="btn-grad w-full"
              style={{ padding: ".95rem", fontSize: "15px", opacity: 0.5, cursor: "not-allowed" }}
              title="Razorpay integration coming soon"
            >
              Continue payment · Razorpay (coming soon)
            </button>

            {/* Skip & Get QR — dev shortcut */}
            <form action={confirmWithoutPaymentAction}>
              <input type="hidden" name="qr_token"   value={qr} />
              <input type="hidden" name="event_slug" value={slug} />
              <button
                type="submit"
                className="btn-outline w-full"
                style={{ padding: ".95rem", fontSize: "14.5px" }}
              >
                Skip pay now &amp; get QR →
              </button>
            </form>
          </div>

          <p className="text-[11px] mt-5 text-center" style={{ color: "var(--dim)" }}>
            Dev mode: payment is stubbed. The &quot;skip&quot; button will be removed once Razorpay is live.
          </p>
        </div>
      </main>
    </>
  );
}
