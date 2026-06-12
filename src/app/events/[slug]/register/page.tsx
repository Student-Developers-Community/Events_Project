import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import RegistrationForm from "@/components/register/RegistrationForm";
import { getPublicEventBySlug } from "@/lib/db/events";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicEventBySlug(slug);
  return { title: data ? `Register · ${data.event.title}` : "Register" };
}

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicEventBySlug(slug);
  if (!data) notFound();

  const { event, tiers } = data;
  const activeTiers = tiers.filter((t) => !t.is_sold_out);
  const ended = new Date(event.ends_at).getTime() < Date.now();

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-7 py-10">
        <Link href={`/events/${slug}`} className="text-[13px] mb-4 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to event
        </Link>

        <header className="mb-7">
          <p className="sec-label mb-2">Registration</p>
          <h1 className="font-extrabold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>{event.title}</h1>
          <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
            {formatEventDate(event.starts_at, event.timezone)} ·{" "}
            {event.is_online ? "Online" : (event.venue_name || event.city || "Venue TBA")}
          </p>
        </header>

        {ended ? (
          <div className="card-base p-10 text-center">
            <div className="text-4xl mb-3 opacity-60">📅</div>
            <h2 className="font-bold text-lg mb-1">Registration closed</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This event has already taken place. Registration is no longer open.
            </p>
          </div>
        ) : activeTiers.length === 0 ? (
          <div className="card-base p-10 text-center">
            <div className="text-4xl mb-3 opacity-60">🎟️</div>
            <h2 className="font-bold text-lg mb-1">Sold out</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              All ticket tiers for this event are sold out.
            </p>
          </div>
        ) : (
          <div className="card-base p-7">
            <RegistrationForm
              eventId={event.id}
              eventSlug={slug}
              questions={event.questions ?? []}
              tiers={tiers.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                price_paise: t.price_paise,
                is_sold_out: t.is_sold_out,
              }))}
            />
          </div>
        )}
      </main>
    </>
  );
}
