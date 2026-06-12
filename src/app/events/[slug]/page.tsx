import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublicEventBySlug } from "@/lib/db/events";
import { formatEventDate, formatINR, categoryIcon } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicEventBySlug(slug);
  if (!data) return { title: "Event not found" };
  return {
    title: `${data.event.title} · TechEvent`,
    description: data.event.subtitle || data.event.description?.slice(0, 160) || "Register for this event on TechEvent.",
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicEventBySlug(slug);
  if (!data) notFound();

  const { event, tiers } = data;
  const minPrice = tiers.length === 0 ? null : Math.min(...tiers.map((t) => t.price_paise));
  const anyAvailable = tiers.some((t) => !t.is_sold_out);

  return (
    <>
      <Navbar />
      <main>
        {/* Cover */}
        <section
          className="relative pt-12 pb-16 px-7"
          style={{
            background: event.cover_image_url
              ? `linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,.9)), url(${event.cover_image_url}) center/cover`
              : "linear-gradient(180deg, rgba(124, 92, 255,.06) 0%, transparent 60%)",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <Link href="/events" className="text-[13px] mb-4 inline-block" style={{ color: "var(--muted)" }}>
              ← All events
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase"
                style={{ background: "rgba(124, 92, 255,.15)", color: "var(--accent)" }}
              >
                {categoryIcon(event.category)} {event.category.replace("_", " ")}
              </span>
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                Hosted by <b style={{ color: "var(--text)" }}>{event.organiser_name}</b>
              </span>
            </div>

            <h1
              className="font-extrabold mb-4"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}
            >
              {event.title}
            </h1>

            {event.subtitle && (
              <p className="text-lg mb-6 max-w-2xl" style={{ color: "var(--muted)" }}>{event.subtitle}</p>
            )}

            <div className="flex gap-5 flex-wrap text-[14px]" style={{ color: "var(--muted)" }}>
              <span>📅 {formatEventDate(event.starts_at, event.timezone)}</span>
              <span>📍 {event.is_online ? "Online" : (event.venue_name || event.city || "Venue TBA")}</span>
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-7 py-12 grid lg:grid-cols-[1fr_320px] gap-10">
          {/* Description */}
          <section>
            <h2 className="sec-title text-xl mb-3">About this event</h2>
            <div
              className="text-[14.5px] leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text)", opacity: 0.92 }}
            >
              {event.description || (
                <span style={{ color: "var(--muted)" }}>The organiser hasn&apos;t added a description yet.</span>
              )}
            </div>

            {/* Questions? — organiser contact */}
            {(event.contact_email || event.contact_phone) && (
              <div
                className="mt-7 p-4 rounded-lg"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
              >
                <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--dim)" }}>
                  Questions? Contact the organiser
                </p>
                <div className="flex flex-col gap-1.5 text-[13.5px]">
                  {event.contact_email && (
                    <a href={`mailto:${event.contact_email}`} className="inline-flex items-center gap-2" style={{ color: "var(--accent-3)" }}>
                      ✉️ {event.contact_email}
                    </a>
                  )}
                  {event.contact_phone && (
                    <a href={`tel:${event.contact_phone}`} className="inline-flex items-center gap-2" style={{ color: "var(--accent-3)" }}>
                      📞 {event.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Side card: tiers + register */}
          <aside>
            <div className="card-base p-5 sticky top-24">
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--dim)" }}>
                  Starting from
                </p>
                <p className="font-extrabold text-3xl gtext">{formatINR(minPrice)}</p>
              </div>

              {tiers.length === 0 ? (
                <p className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>
                  Ticket tiers haven&apos;t been published yet.
                </p>
              ) : (
                <ul className="list-none m-0 p-0 mb-5 flex flex-col gap-2">
                  {tiers.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 p-2.5 rounded-md"
                      style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold">{t.name}</div>
                        {t.description && (
                          <div className="text-[11.5px] mt-0.5" style={{ color: "var(--muted)" }}>{t.description}</div>
                        )}
                        {t.capacity && (
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--dim)" }}>
                            {t.is_sold_out
                              ? "Sold out"
                              : t.capacity - t.sold_count <= 10
                                ? `Only ${t.capacity - t.sold_count} left`
                                : `${t.capacity - t.sold_count} available`}
                          </div>
                        )}
                      </div>
                      <div
                        className="font-bold text-[14px] shrink-0"
                        style={{ color: t.is_sold_out ? "var(--dim)" : (t.price_paise === 0 ? "#86efac" : "var(--accent)") }}
                      >
                        {formatINR(t.price_paise)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={anyAvailable ? `/events/${event.slug}/register` : "#"}
                className={anyAvailable ? "btn-grad w-full text-center" : "btn-outline w-full text-center"}
                style={{
                  padding: ".85rem 1.4rem",
                  fontSize: "14.5px",
                  pointerEvents: anyAvailable ? "auto" : "none",
                  opacity: anyAvailable ? 1 : 0.5,
                }}
              >
                {anyAvailable ? "Register now →" : "Sold out"}
              </Link>

              <p className="text-[11px] mt-3 text-center" style={{ color: "var(--dim)" }}>
                Secure checkout via Razorpay · UPI, cards, netbanking
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
