import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For Organisers · TechEvent",
  description: "Host hackathons, workshops, and meetups. Event pages, ticketing, QR check-in, email + calendar invites — all in one place.",
};

const STEPS = [
  { n: "1", title: "Create your event", body: "Title, cover image, date, venue, description, and ticket tiers — free or paid. Takes a few minutes." },
  { n: "2", title: "Publish & share", body: "Goes live instantly at your own event link. Share it anywhere — no approval, no gatekeeping." },
  { n: "3", title: "Run the day", body: "Scan QR codes at the door from your phone. Watch live check-in stats. Export the attendee list anytime." },
];

const FEATURES = [
  { icon: "🎟️", title: "Tiered ticketing", body: "Multiple tiers — Early Bird, General, Student. Free (₹0) or paid. Capacity limits per tier." },
  { icon: "📅", title: "Email + calendar", body: "Attendees get an instant confirmation email with a .ics calendar invite and their QR ticket." },
  { icon: "⏰", title: "Auto reminders", body: "Day-before and hour-before reminder emails fire automatically so no one forgets." },
  { icon: "⚡", title: "QR check-in", body: "Scan tickets at the door with your phone camera. No app to install. Live attendee count." },
  { icon: "📊", title: "Attendee dashboard", body: "Search, filter, and export your full attendee roster to CSV for sponsors or records." },
  { icon: "📍", title: "Discovery", body: "Published events appear on the public Discover page, filterable by city, category, and date." },
];

export default async function OrganisersPage() {
  const user = await getSessionUser();
  const ctaHref = user ? "/dashboard/events/new" : "/auth/signup?next=/dashboard/events/new";

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="relative px-7 text-center overflow-hidden"
          style={{ paddingTop: 80, paddingBottom: 64 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 55% 50% at 50% 0%, rgba(124, 92, 255,.14), transparent 70%)" }}
          />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium mb-6"
              style={{ background: "rgba(124, 92, 255,.1)", border: "1px solid rgba(124, 92, 255,.3)", color: "var(--accent-3)" }}
            >
              For organisers
            </div>
            <h1 className="font-extrabold mb-5" style={{ fontSize: "clamp(34px, 5.5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
              Host your tech event<br /><span className="gtext">the easy way.</span>
            </h1>
            <p className="mx-auto mb-9" style={{ color: "var(--muted)", fontSize: "17px", lineHeight: 1.6, maxWidth: 540 }}>
              Beautiful event pages, instant checkout, email + calendar invites, auto-reminders, and QR check-in at the door. Built for Indian hackathons, workshops, and meetups.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href={ctaHref} className="btn-grad" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
                Create your event →
              </Link>
              <Link href="/pricing" className="btn-outline" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1100px] mx-auto px-7 py-14">
          <header className="mb-9">
            <p className="sec-label mb-2">How it works</p>
            <h2 className="sec-title">Live in three steps.</h2>
          </header>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card-base p-6">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-black mb-4"
                  style={{ background: "var(--grad)", color: "#001a10" }}
                >
                  {s.n}
                </div>
                <h3 className="font-bold text-base mb-1.5">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-[1100px] mx-auto px-7 pb-14">
          <header className="mb-9">
            <p className="sec-label mb-2">Everything included</p>
            <h2 className="sec-title">Tools that run the whole event.</h2>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-base p-6">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3.5"
                  style={{ background: "rgba(124, 92, 255,.12)", border: "1px solid rgba(124, 92, 255,.25)" }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1100px] mx-auto px-7 pb-24">
          <div
            className="rounded-2xl p-10 md:p-14 text-center"
            style={{ background: "linear-gradient(135deg, rgba(124, 92, 255,.08), rgba(0,212,255,.08))", border: "1px solid rgba(124, 92, 255,.25)" }}
          >
            <h2 className="font-extrabold mb-3" style={{ fontSize: "clamp(26px, 4vw, 38px)", letterSpacing: "-0.02em" }}>
              Ready to host your <span className="gtext">first event</span>?
            </h2>
            <p className="max-w-xl mx-auto mb-6" style={{ color: "var(--muted)" }}>
              Free to start. Create an event in minutes — no approval needed.
            </p>
            <Link href={ctaHref} className="btn-grad" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
              Get started free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
