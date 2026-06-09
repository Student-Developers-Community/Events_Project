/** Format INR price from paise. ₹0 for free. */
export function formatINR(paise: number | null): string {
  if (paise === null) return "TBA";
  if (paise === 0) return "FREE";
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** "DEC 14 · SAT · 9:00 AM" */
export function formatEventDate(iso: string, timezone = "Asia/Kolkata"): string {
  const d = new Date(iso);
  const datePart = d.toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    weekday: "short",
  }).toUpperCase();
  const timePart = d.toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  // "Dec 14, Sat" → "DEC 14 · SAT"
  return `${datePart.replace(",", " ·")} · ${timePart}`;
}

const CATEGORY_ICONS: Record<string, string> = {
  hackathon: "🏆",
  workshop: "🤖",
  conference: "🎤",
  meetup: "👥",
  demo_day: "🚀",
  other: "✨",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "✨";
}
