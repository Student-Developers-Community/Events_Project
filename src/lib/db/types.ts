/**
 * DB row shapes. Mirrors supabase/schema.sql.
 * Once the project stabilises, replace with output from `supabase gen types`.
 */

export type EventCategory =
  | "hackathon"
  | "workshop"
  | "conference"
  | "meetup"
  | "demo_day"
  | "other";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string;
  timezone: string;
  is_online: boolean;
  venue_name: string | null;
  city: string | null;
  total_capacity: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  organiser_id: string;
  organiser_name: string;
  organiser_avatar: string | null;
};

export type PublicTier = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_paise: number;
  capacity: number | null;
  sold_count: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  sort_order: number;
  is_sold_out: boolean;
};

/** Event card on the Discover grid — joins the lowest active tier. */
export type EventListItem = PublicEvent & {
  min_price_paise: number | null;       // null = no tiers yet
  any_tier_available: boolean;
};
