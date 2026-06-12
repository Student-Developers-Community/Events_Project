import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import EventCardLive from "@/components/EventCardLive";
import { listPublicEvents } from "@/lib/db/events";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "💳", title: "Razorpay native",     body: "INR pricing, UPI, cards, netbanking. Auto-refunds. Real-time payment dashboard. No PayPal headaches." },
  { icon: "📱", title: "WhatsApp follow-ups", body: "Confirmation, day-before, and check-in reminders sent via WhatsApp. Where your attendees actually read." },
  { icon: "⚡", title: "QR entry, no app",    body: "Each ticket gets a unique QR. Your phone camera scans them at the door. Live attendee count." },
  { icon: "📊", title: "Organiser dashboard", body: "Live check-in stats. Attendee CSV export. Revenue summary. Refund management. All in one place." },
];

const TRUSTED_BY = ["SDC INDIA", "SNIST", "PyCon India", "GDSC", "Hack This Fall"];

export default async function HomePage() {
  const events = await listPublicEvents({ limit: 3 });

  return (
    <>
      <Navbar />
      <main>
        <Hero />

        {/* Trust strip */}
        <div className="max-w-[1100px] mx-auto px-7 mt-12">
          <div
            className="flex items-center justify-between gap-6 flex-wrap py-6"
            style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--dim)" }}
            >
              Trusted by tech communities
            </span>
            <div className="flex gap-7 flex-wrap" style={{ color: "var(--muted)" }}>
              {TRUSTED_BY.map((name) => (
                <span key={name} className="font-semibold text-sm opacity-70">{name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Discover */}
        <section id="discover" className="max-w-[1100px] mx-auto px-7 py-20">
          <header className="flex justify-between items-end gap-4 flex-wrap mb-9">
            <div>
              <p className="sec-label mb-2">Upcoming · Hyderabad</p>
              <h2 className="sec-title">Discover events near you</h2>
            </div>
            <Link
              href="/events"
              className="text-sm px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              All events →
            </Link>
          </header>

          {events.length === 0 ? (
            <div className="card-base p-12 text-center" style={{ borderStyle: "dashed" }}>
              <div className="text-4xl mb-3 opacity-60">📭</div>
              <p className="text-sm max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                No published events yet. Be the first — create one from your dashboard.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCardLive key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        {/* Features */}
        <section className="max-w-[1100px] mx-auto px-7 pb-20">
          <header className="mb-9">
            <p className="sec-label mb-2">Why TechEvent</p>
            <h2 className="sec-title">Made for Indian tech events.</h2>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-base p-6">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3.5"
                  style={{
                    background: "rgba(124, 92, 255,.12)",
                    border: "1px solid rgba(124, 92, 255,.25)",
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="max-w-[1100px] mx-auto px-7 pb-24">
          <div
            className="rounded-2xl p-10 md:p-14 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(124, 92, 255,.08), rgba(0,212,255,.08))",
              border: "1px solid rgba(124, 92, 255,.25)",
            }}
          >
            <p className="sec-label mb-2">// Be early</p>
            <h2
              className="font-extrabold mb-3"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.02em" }}
            >
              Ready to launch your <span className="gtext">next event</span>?
            </h2>
            <p className="max-w-xl mx-auto mb-6" style={{ color: "var(--muted)" }}>
              TechEvent is in private alpha. Sign up to create your first event and we&apos;ll set you up with Razorpay + WhatsApp + QR check-in.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/auth/login" className="btn-grad" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
                Get started
              </Link>
              <Link href="/blog" className="btn-outline" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
                Learn more
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
