"use client";

import { CalendarDays, MapPin, Users, ArrowUpRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { formatINR } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Format a datetime-local string deterministically (no Date()/tz → no hydration mismatch). */
function fmtDateLocal(s: string): string | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const year = +y, month = +mo - 1, day = +d, hour = +h, min = +mi;
  // Zeller-free weekday via UTC (deterministic across server/client)
  const wd = DAYS[new Date(Date.UTC(year, month, day)).getUTCDay()];
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${wd}, ${day} ${MONTHS[month]} ${year} · ${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export type PreviewState = {
  title: string;
  subtitle: string;
  category: string;
  startsAt: string;
  isOnline: boolean;
  venueName: string;
  city: string;
  onlineUrl: string;
  coverUrl: string;
  isHackathon: boolean;
  teamSize: string;
  entryFeeRupees: string;
};

export default function EventPreview(s: PreviewState) {
  const date = fmtDateLocal(s.startsAt);
  const location = s.isOnline ? (s.onlineUrl || "Online event") : ([s.venueName, s.city].filter(Boolean).join(", ") || "Venue / city");
  const fee = Number(s.entryFeeRupees);
  const priceChip = s.isHackathon
    ? (fee > 0 ? formatINR(Math.round(fee * 100)) : "FREE")
    : "TICKETS";

  return (
    <div className="card-base overflow-hidden" style={{ position: "sticky", top: 90 }}>
      <p className="text-[11px] uppercase tracking-wider px-4 pt-3" style={{ color: "var(--dim)" }}>Live preview</p>

      {/* cover */}
      <div
        className="h-44 relative mt-2 mx-4 rounded-lg overflow-hidden"
        style={{
          background: s.coverUrl
            ? `url(${s.coverUrl}) center/cover`
            : "linear-gradient(135deg, rgba(124,92,255,.25), rgba(0,212,255,.18) 70%)",
          border: "1px solid var(--border)",
        }}
      >
        {!s.coverUrl && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,.9)" }}>
            <CategoryIcon category={s.category} size={44} strokeWidth={1.3} />
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
          style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }}>
          <CategoryIcon category={s.category} size={13} strokeWidth={2} />
          {s.category.replace("_", " ")}
        </span>
        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: priceChip === "FREE" ? "rgba(22,163,74,.95)" : "var(--accent)", color: priceChip === "FREE" ? "#fff" : "#001a10" }}>
          {priceChip}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-1.5" style={{ color: "var(--accent-3)" }}>
          <CalendarDays size={13} strokeWidth={2} />
          {date ?? "Date & time"}
        </div>
        <h3 className="font-bold text-[18px] leading-snug mb-1" style={{ color: s.title ? "var(--text)" : "var(--dim)" }}>
          {s.title || "Your event title"}
        </h3>
        {s.subtitle && <p className="text-[13px] mb-2" style={{ color: "var(--muted)" }}>{s.subtitle}</p>}
        <div className="flex items-center gap-1.5 text-[13px] mb-3" style={{ color: "var(--muted)" }}>
          <MapPin size={13} strokeWidth={2} className="shrink-0" />
          {location}
        </div>
        {s.isHackathon && (
          <div className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: "var(--muted)" }}>
            <Users size={13} strokeWidth={2} /> Team of {s.teamSize || "?"}
          </div>
        )}
        <div className="btn-grad w-full justify-center" style={{ padding: ".6rem", fontSize: "13.5px", opacity: 0.85, pointerEvents: "none" }}>
          {s.isHackathon ? "Register your team" : "Register now"} <ArrowUpRight size={15} />
        </div>
      </div>
    </div>
  );
}
