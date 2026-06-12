import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type InvitationStatus = "invited" | "accepted" | "declined";

export type InvitationRow = {
  id: string;
  email: string;
  name: string | null;
  token: string;
  status: InvitationStatus;
  registration_id: string | null;
  created_at: string;
  responded_at: string | null;
};

/** Invitations for an event the current organiser owns (RLS-gated). */
export async function listEventInvitations(eventId: string): Promise<InvitationRow[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("event_invitations")
    .select("id, email, name, token, status, registration_id, created_at, responded_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listEventInvitations]", error.message);
    return [];
  }
  return (data ?? []) as InvitationRow[];
}

export type InvitationDetail = {
  invitation: InvitationRow & { event_id: string };
  event: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    cover_image_url: string | null;
    starts_at: string;
    ends_at: string;
    timezone: string;
    is_online: boolean;
    venue_name: string | null;
    city: string | null;
    online_url: string | null;
    organiser_name: string;
  };
  qr_token: string | null;
};

/** Read an invitation by its secret token (server-only, bypasses RLS). */
export async function getInvitationByToken(token: string): Promise<InvitationDetail | null> {
  const svc = getSupabaseServiceClient();
  if (!svc) return null;

  const { data: inv } = await svc
    .from("event_invitations")
    .select("id, event_id, email, name, token, status, registration_id, created_at, responded_at")
    .eq("token", token)
    .maybeSingle();
  if (!inv) return null;

  const { data: ev } = await svc
    .from("events")
    .select(`id, slug, title, subtitle, description, cover_image_url, starts_at, ends_at, timezone, is_online, venue_name, city, online_url, organisers ( display_name )`)
    .eq("id", inv.event_id)
    .maybeSingle();
  if (!ev) return null;
  const org = Array.isArray(ev.organisers) ? ev.organisers[0] : ev.organisers;

  let qr_token: string | null = null;
  if (inv.registration_id) {
    const { data: reg } = await svc
      .from("registrations")
      .select("qr_token")
      .eq("id", inv.registration_id)
      .maybeSingle();
    qr_token = reg?.qr_token ?? null;
  }

  return {
    invitation: inv as InvitationRow & { event_id: string },
    event: {
      id: ev.id, slug: ev.slug, title: ev.title, subtitle: ev.subtitle, description: ev.description,
      cover_image_url: ev.cover_image_url, starts_at: ev.starts_at, ends_at: ev.ends_at, timezone: ev.timezone,
      is_online: ev.is_online, venue_name: ev.venue_name, city: ev.city, online_url: ev.online_url,
      organiser_name: org?.display_name ?? "the organiser",
    },
    qr_token,
  };
}
