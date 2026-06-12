import { Trophy, Wrench, Mic, Users, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import type { EventCategory } from "@/lib/db/types";

/** Lucide icon per event category — SVG, not emoji (crisper, themeable, a11y). */
const ICONS: Record<string, LucideIcon> = {
  hackathon:  Trophy,
  workshop:   Wrench,
  conference: Mic,
  meetup:     Users,
  demo_day:   Rocket,
  other:      Sparkles,
};

export default function CategoryIcon({
  category,
  size = 18,
  className,
  strokeWidth = 1.75,
}: {
  category: EventCategory | string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = ICONS[category] ?? Sparkles;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
