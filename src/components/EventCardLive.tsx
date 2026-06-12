import Link from "next/link";
import { MapPin, CalendarDays, ArrowUpRight } from "lucide-react";
import type { EventListItem } from "@/lib/db/types";
import CategoryIcon from "@/components/CategoryIcon";
import { formatINR, formatEventDate } from "@/lib/format";

export default function EventCardLive({ event }: { event: EventListItem }) {
  const isFree = event.min_price_paise === 0;
  const priceLabel = formatINR(event.min_price_paise);
  const location = event.is_online
    ? "Online"
    : event.venue_name || event.city || "Venue TBA";

  return (
    <Link
      href={`/events/${event.slug}`}
      className="card-base card-interactive group block overflow-hidden no-underline"
      style={{ color: "var(--text)" }}
    >
      <div
        className="h-40 relative"
        style={{
          background: event.cover_image_url
            ? `url(${event.cover_image_url}) center/cover`
            : "linear-gradient(135deg, rgba(124, 92, 255,.18), rgba(0,212,255,.18) 70%)",
        }}
      >
        {!event.cover_image_url && (
          <>
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 70% 30%, rgba(124, 92, 255,.3), transparent 60%)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,.92)" }}>
              <CategoryIcon category={event.category} size={42} strokeWidth={1.4} />
            </div>
          </>
        )}

        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide capitalize"
          style={{
            background: "rgba(0,0,0,.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.12)",
            color: "var(--text)",
          }}
        >
          <CategoryIcon category={event.category} size={13} strokeWidth={2} />
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
            style={{ background: "rgba(0,0,0,.78)", color: "var(--muted)" }}
          >
            SOLD OUT
          </span>
        )}
      </div>

      <div className="p-4 pb-5">
        <div
          className="flex items-center gap-1.5 text-[12px] font-semibold mb-2"
          style={{ color: "var(--accent-3)", letterSpacing: ".02em" }}
        >
          <CalendarDays size={13} strokeWidth={2} />
          {formatEventDate(event.starts_at, event.timezone)}
        </div>

        <h3 className="font-bold text-[16.5px] mb-2 leading-snug flex items-start gap-1.5">
          <span className="flex-1">{event.title}</span>
          <ArrowUpRight
            size={17}
            strokeWidth={2.2}
            className="shrink-0 mt-0.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
            style={{ color: "var(--accent)" }}
          />
        </h3>

        {event.subtitle && (
          <p className="text-[13px] mb-2.5 line-clamp-2" style={{ color: "var(--muted)" }}>
            {event.subtitle}
          </p>
        )}

        <div className="text-[13px] flex items-center gap-1.5 flex-wrap" style={{ color: "var(--muted)" }}>
          <MapPin size={13} strokeWidth={2} className="shrink-0" />
          <span>{location}</span>
          {event.organiser_name && (
            <span className="truncate">· by {event.organiser_name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
