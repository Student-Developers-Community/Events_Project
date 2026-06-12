import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pricing · TechEvent",
  description: "Free events cost nothing. Paid events take a small platform fee only when a ticket sells. No upfront cost, no subscription.",
};

const TIERS = [
  {
    name: "Free events",
    price: "₹0",
    unit: "forever",
    highlight: false,
    tagline: "Host free hackathons, meetups, and workshops at zero cost.",
    features: [
      "Unlimited free events",
      "Unlimited attendees",
      "Email + calendar invites",
      "Auto reminders",
      "QR check-in",
      "Attendee CSV export",
    ],
    cta: "Start free",
  },
  {
    name: "Paid events",
    price: "5%",
    unit: "per ticket sold",
    highlight: true,
    tagline: "Only pay when you earn. Nothing upfront, no subscription.",
    features: [
      "Everything in Free",
      "Razorpay checkout (UPI, cards, netbanking)",
      "Multiple paid ticket tiers",
      "Refund management",
      "Revenue dashboard",
      "Platform fee 5% + payment gateway charges",
    ],
    cta: "Start selling",
    note: "Razorpay payments are coming soon — paid events use a placeholder checkout until then.",
  },
  {
    name: "Pro",
    price: "Coming soon",
    unit: "",
    highlight: false,
    tagline: "For high-volume organisers who want zero platform fee.",
    features: [
      "0% platform fee",
      "Advanced analytics",
      "Priority listing on Discover",
      "Custom event URL",
      "Verified organiser badge",
    ],
    cta: "Notify me",
    disabled: true,
  },
];

export default async function PricingPage() {
  const user = await getSessionUser();
  const startHref = user ? "/dashboard/events/new" : "/auth/signup?next=/dashboard/events/new";

  return (
    <>
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-7 py-14">
        <header className="text-center mb-12">
          <p className="sec-label mb-2">Pricing</p>
          <h1 className="font-extrabold mb-3" style={{ fontSize: "clamp(30px, 4.5vw, 46px)", letterSpacing: "-0.03em" }}>
            Simple, fair pricing.
          </h1>
          <p className="mx-auto" style={{ color: "var(--muted)", fontSize: "16px", maxWidth: 520 }}>
            Free events are completely free. For paid events, we only take a cut when a ticket sells — you pay nothing upfront.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3 items-start">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="card-base p-7 flex flex-col"
              style={
                t.highlight
                  ? { border: "1px solid var(--accent)", boxShadow: "0 0 40px rgba(124, 92, 255,.08)" }
                  : undefined
              }
            >
              {t.highlight && (
                <span
                  className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3"
                  style={{ background: "var(--accent)", color: "#001a10" }}
                >
                  Most popular
                </span>
              )}
              <h2 className="font-bold text-lg mb-1">{t.name}</h2>
              <p className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>{t.tagline}</p>

              <div className="mb-5">
                <span className="font-extrabold text-3xl gtext">{t.price}</span>
                {t.unit && <span className="text-[13px] ml-2" style={{ color: "var(--muted)" }}>{t.unit}</span>}
              </div>

              <ul className="list-none m-0 p-0 flex flex-col gap-2.5 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px]" style={{ color: "var(--text)" }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>
                    <span style={{ opacity: 0.9 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {t.disabled ? (
                <button
                  disabled
                  className="btn-outline w-full text-center"
                  style={{ padding: ".75rem 1.2rem", fontSize: "14px", opacity: 0.5, cursor: "not-allowed" }}
                >
                  {t.cta}
                </button>
              ) : (
                <Link
                  href={startHref}
                  className={t.highlight ? "btn-grad w-full text-center" : "btn-outline w-full text-center"}
                  style={{ padding: ".75rem 1.2rem", fontSize: "14px" }}
                >
                  {t.cta}
                </Link>
              )}

              {t.note && (
                <p className="text-[11px] mt-3" style={{ color: "var(--dim)" }}>{t.note}</p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto mt-16">
          <h2 className="sec-title text-2xl mb-6 text-center">Questions</h2>
          <div className="flex flex-col gap-3">
            {[
              { q: "Do I pay anything to start?", a: "No. Creating an account and hosting free events costs nothing. You only pay a fee on paid tickets sold." },
              { q: "When is the platform fee charged?", a: "Only when a paid ticket sells — it's deducted from the ticket price. No listing fees, no monthly minimums." },
              { q: "Are payments live yet?", a: "Razorpay integration is in progress. Free events work fully today; paid checkout uses a placeholder until Razorpay goes live." },
              { q: "Can I export my attendees?", a: "Yes — every event has a one-click CSV export of the full attendee roster." },
            ].map((item) => (
              <div key={item.q} className="card-base p-5">
                <p className="font-semibold text-[14.5px] mb-1.5">{item.q}</p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
