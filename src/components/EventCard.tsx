import Link from "next/link";

export type DemoEvent = {
  id: string;
  slug: string;
  category: string;
  title: string;
  date: string;
  location: string;
  duration: string;
  capacity: string;
  price: string;            // "FREE" or "₹499"
  tags: string[];
  icon: string;             // emoji
};

export default function EventCard({ event }: { event: DemoEvent }) {
  const isFree = event.price === "FREE";

  return (
    <Link
      href={`/events/${event.slug}`}
      className="card-base block overflow-hidden no-underline"
      style={{ color: "var(--text)" }}
    >
      <div
        className="h-40 relative"
        style={{
          background: "linear-gradient(135deg, rgba(0,255,157,.18), rgba(0,212,255,.18) 70%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 70% 30%, rgba(0,255,157,.3), transparent 60%)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-90">
          {event.icon}
        </div>

        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider"
          style={{
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "var(--text)",
          }}
        >
          {event.category}
        </span>

        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: isFree ? "rgba(22,163,74,.95)" : "var(--accent)",
            color: isFree ? "#fff" : "#001a10",
          }}
        >
          {event.price}
        </span>
      </div>

      <div className="p-4 pb-5">
        <div
          className="text-[12px] font-semibold mb-1.5"
          style={{ color: "var(--accent-3)", letterSpacing: ".03em" }}
        >
          {event.date}
        </div>
        <h3 className="font-bold text-[16.5px] mb-2 leading-snug">{event.title}</h3>
        <div className="text-[13px] flex gap-3 flex-wrap mb-2.5" style={{ color: "var(--muted)" }}>
          <span>📍 {event.location}</span>
          <span>⏱ {event.duration}</span>
          <span>👥 {event.capacity}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {event.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-medium tracking-wider"
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
