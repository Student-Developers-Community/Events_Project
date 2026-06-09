import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCardLive from "@/components/EventCardLive";
import { listPublicEvents } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Discover events · TechEvent",
  description: "Browse upcoming hackathons, workshops, conferences, and meetups across India.",
};

const CATEGORIES = [
  { key: undefined, label: "All" },
  { key: "hackathon", label: "Hackathons" },
  { key: "workshop", label: "Workshops" },
  { key: "conference", label: "Conferences" },
  { key: "meetup", label: "Meetups" },
  { key: "demo_day", label: "Demo days" },
] as const;

// Indian tech hubs with the most activity. Editable.
const CITIES = [
  "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Pune", "Chennai", "Kolkata", "Ahmedabad",
] as const;

type Range = "any" | "this_week" | "this_month" | "next_30";

const RANGES: Array<{ key: Range; label: string }> = [
  { key: "any",        label: "Any time" },
  { key: "this_week",  label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "next_30",    label: "Next 30 days" },
];

function rangeBounds(r: Range): { from?: Date; to?: Date } {
  const now = new Date();
  if (r === "this_week") {
    const end = new Date(now); end.setDate(end.getDate() + 7);
    return { from: now, to: end };
  }
  if (r === "this_month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from: now, to: end };
  }
  if (r === "next_30") {
    const end = new Date(now); end.setDate(end.getDate() + 30);
    return { from: now, to: end };
  }
  return {};
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; range?: Range }>;
}) {
  const sp = await searchParams;
  const range: Range = (RANGES.find((r) => r.key === sp.range)?.key ?? "any") as Range;
  const bounds = rangeBounds(range);

  const events = await listPublicEvents({
    category: sp.category,
    city: sp.city,
    limit: 60,
  });

  // Client-side narrow by date range (cheap, list is small)
  const filtered = events.filter((e) => {
    const start = new Date(e.starts_at);
    if (bounds.from && start < bounds.from && new Date(e.ends_at) < bounds.from) return false;
    if (bounds.to   && start > bounds.to) return false;
    return true;
  });

  // Build query strings that preserve other filters
  const buildHref = (override: Partial<{ category: string | undefined; city: string | undefined; range: Range | undefined }>) => {
    const qs = new URLSearchParams();
    const cat   = "category" in override ? override.category : sp.category;
    const city  = "city" in override     ? override.city     : sp.city;
    const r     = "range" in override    ? override.range    : range;
    if (cat)               qs.set("category", cat);
    if (city)              qs.set("city", city);
    if (r && r !== "any")  qs.set("range", r);
    const s = qs.toString();
    return s ? `/events?${s}` : "/events";
  };

  return (
    <>
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-7 py-12">
        <header className="mb-8">
          <p className="sec-label mb-2">Discover · India</p>
          <h1 className="sec-title">Upcoming tech events</h1>
          <p className="sec-sub mt-2">
            Hackathons, workshops, conferences, and meetups. Updated daily.
          </p>
        </header>

        {/* Filter row 1: Category */}
        <div className="flex gap-2 flex-wrap mb-3">
          {CATEGORIES.map((c) => {
            const active = (sp.category ?? undefined) === c.key;
            return (
              <Link
                key={c.label}
                href={buildHref({ category: c.key })}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                style={{
                  color: active ? "#001a10" : "var(--muted)",
                  background: active ? "var(--accent)" : "transparent",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* Filter row 2: City + Date range */}
        <div className="flex gap-2 flex-wrap items-center mb-8 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[11px] uppercase tracking-wider mr-1" style={{ color: "var(--dim)" }}>City</span>
          <Link
            href={buildHref({ city: undefined })}
            className="px-2.5 py-1 rounded-full text-[12px] transition-colors"
            style={{
              color: !sp.city ? "#001a10" : "var(--muted)",
              background: !sp.city ? "var(--accent-2)" : "transparent",
              border: !sp.city ? "1px solid var(--accent-2)" : "1px solid var(--border)",
            }}
          >
            All
          </Link>
          {CITIES.map((c) => {
            const active = sp.city === c;
            return (
              <Link
                key={c}
                href={buildHref({ city: c })}
                className="px-2.5 py-1 rounded-full text-[12px] transition-colors"
                style={{
                  color: active ? "#001a10" : "var(--muted)",
                  background: active ? "var(--accent-2)" : "transparent",
                  border: active ? "1px solid var(--accent-2)" : "1px solid var(--border)",
                }}
              >
                {c}
              </Link>
            );
          })}
          <span className="ml-3 text-[11px] uppercase tracking-wider mr-1" style={{ color: "var(--dim)" }}>When</span>
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <Link
                key={r.key}
                href={buildHref({ range: r.key })}
                className="px-2.5 py-1 rounded-full text-[12px] transition-colors"
                style={{
                  color: active ? "#001a10" : "var(--muted)",
                  background: active ? "var(--accent-3)" : "transparent",
                  border: active ? "1px solid var(--accent-3)" : "1px solid var(--border)",
                }}
              >
                {r.label}
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EventCardLive key={e.id} event={e} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function EmptyState() {
  return (
    <div
      className="card-base p-16 text-center"
      style={{ borderStyle: "dashed" }}
    >
      <div className="text-5xl mb-4 opacity-60">📭</div>
      <h2 className="font-bold text-xl mb-2">No events match those filters</h2>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
        Try clearing some filters, or be the first to publish an event your community will love.
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Link href="/events" className="btn-outline" style={{ padding: ".6rem 1.2rem", fontSize: "13.5px" }}>
          Clear filters
        </Link>
        <Link href="/dashboard/events/new" className="btn-grad" style={{ padding: ".6rem 1.2rem", fontSize: "13.5px" }}>
          Create event →
        </Link>
      </div>
    </div>
  );
}
