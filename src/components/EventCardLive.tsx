import Link from "next/link";
import type { EventListItem } from "@/lib/db/types";
import { formatINR, formatEventDate, categoryIcon } from "@/lib/format";

export default function EventCardLive({ event }: { event: EventListItem }) {
  const isFree = event.min_price_paise === 0;
  const priceLabel = formatINR(event.min_price_paise);
  const location = event.is_online
    ? "Online"
    : event.venue_name || event.city || "Venue TBA";

  return (
    <Link
      href={`/events/${event.slug}`}
      className="card-base block overflow-hidden no-underline"
      style={{ color: "var(--text)" }}
    >
      <div
        className="h-40 relative"
        style={{
          background: event.cover_image_url
            ? `url(${event.cover_image_url}) center/cover`
            : "linear-gradient(135deg, rgba(0,255,157,.18), rgba(0,212,255,.18) 70%)",
        }}
      >
        {!event.cover_image_url && (
          <>
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 70% 30%, rgba(0,255,157,.3), transparent 60%)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-90">
              {categoryIcon(event.category)}
            </div>
          </>
        )}

        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase"
          style={{
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "var(--text)",
          }}
        >
          {event.category.replace("_", " ")}
        </span>

        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: isFree ? "rgba(22,163,74,.95)" : "var(--accent)",
            color: isFree ? "#fff" : "#001a10",
          }}
        >
          {priceLabel}
        </span>

        {!event.any_tier_available && (
          <span
            className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(0,0,0,.75)", color: "var(--muted)" }}
          >
            SOLD OUT
          </span>
        )}
      </div>

      <div className="p-4 pb-5">
        <div
          className="text-[12px] font-semibold mb-1.5"
          style={{ color: "var(--accent-3)", letterSpacing: ".03em" }}
        >
          {formatEventDate(event.starts_at, event.timezone)}
        </div>
        <h3 className="font-bold text-[16.5px] mb-2 leading-snug">{event.title}</h3>
        {event.subtitle && (
          <p className="text-[13px] mb-2.5" style={{ color: "var(--muted)" }}>
            {event.subtitle}
          </p>
        )}
        <div className="text-[13px] flex gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
          <span>📍 {location}</span>
          {event.organiser_name && <span>· by {event.organiser_name}</span>}
        </div>
      </div>
    </Link>
  );
}
