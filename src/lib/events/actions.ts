"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { eventCreateSchema, tierCreateSchema } from "./schemas";
import { slugify, withRandomSuffix } from "./slug";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Insert an event for the current organiser. Status starts as 'draft'. */
export async function createEventAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = eventCreateSchema.safeParse({
    title:        formData.get("title"),
    subtitle:     formData.get("subtitle") ?? "",
    description:  formData.get("description") ?? "",
    category:     formData.get("category"),
    starts_at:    formData.get("starts_at"),
    ends_at:      formData.get("ends_at"),
    is_online:    formData.get("is_online") === "on",
    venue_name:   formData.get("venue_name") ?? "",
    city:         formData.get("city") ?? "",
    online_url:   formData.get("online_url") ?? "",
    total_capacity: formData.get("total_capacity") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    contact_email:  formData.get("contact_email") ?? "",
    contact_phone:  formData.get("contact_phone") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Build a unique slug — try base, retry once with random suffix on collision
  const baseSlug = slugify(v.title) || withRandomSuffix("event");
  let slug = baseSlug;
  let attempt = 0;
  let newEventId: string | null = null;

  while (attempt < 3) {
    const { data, error } = await sb
      .from("events")
      .insert({
        organiser_id: user.id,
        slug,
        title: v.title,
        subtitle: v.subtitle || null,
        description: v.description || null,
        category: v.category,
        status: "draft",
        starts_at: new Date(v.starts_at).toISOString(),
        ends_at: new Date(v.ends_at).toISOString(),
        is_online: v.is_online,
        venue_name: v.venue_name || null,
        city: v.city || null,
        online_url: v.online_url || null,
        total_capacity: typeof v.total_capacity === "number" ? v.total_capacity : null,
        cover_image_url: v.cover_image_url || null,
        contact_email: v.contact_email || null,
        contact_phone: v.contact_phone || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      newEventId = data.id;
      break;
    }
    // 23505 = unique_violation (slug collision)
    if (error?.code === "23505" && error.message.includes("slug")) {
      slug = withRandomSuffix(baseSlug);
      attempt++;
      continue;
    }
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  if (!newEventId) return { ok: false, error: "Couldn't generate a unique URL — try a different title" };

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${newEventId}`);
}

/** Update an existing event the current organiser owns. */
export async function updateEventAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return { ok: false, error: "Missing event id" };

  const parsed = eventCreateSchema.safeParse({
    title:        formData.get("title"),
    subtitle:     formData.get("subtitle") ?? "",
    description:  formData.get("description") ?? "",
    category:     formData.get("category"),
    starts_at:    formData.get("starts_at"),
    ends_at:      formData.get("ends_at"),
    is_online:    formData.get("is_online") === "on",
    venue_name:   formData.get("venue_name") ?? "",
    city:         formData.get("city") ?? "",
    online_url:   formData.get("online_url") ?? "",
    total_capacity: formData.get("total_capacity") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    contact_email:  formData.get("contact_email") ?? "",
    contact_phone:  formData.get("contact_phone") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await sb
    .from("events")
    .update({
      title: v.title,
      subtitle: v.subtitle || null,
      description: v.description || null,
      category: v.category,
      starts_at: new Date(v.starts_at).toISOString(),
      ends_at: new Date(v.ends_at).toISOString(),
      is_online: v.is_online,
      venue_name: v.venue_name || null,
      city: v.city || null,
      online_url: v.online_url || null,
      total_capacity: typeof v.total_capacity === "number" ? v.total_capacity : null,
      cover_image_url: v.cover_image_url || null,
      contact_email: v.contact_email || null,
      contact_phone: v.contact_phone || null,
      updated_by: user.id,
    })
    .eq("id", eventId)
    .eq("organiser_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/dashboard/events/${eventId}`);
}

/** Add a ticket tier to an existing event the current user owns. */
export async function createTierAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = tierCreateSchema.safeParse({
    event_id:     formData.get("event_id"),
    name:         formData.get("name"),
    description:  formData.get("description") ?? "",
    price_rupees: formData.get("price_rupees"),
    capacity:     formData.get("capacity") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // RLS already gates this, but double-check ownership for a friendlier error
  const { data: owned } = await sb
    .from("events")
    .select("id")
    .eq("id", v.event_id)
    .eq("organiser_id", user.id)
    .maybeSingle();
  if (!owned) return { ok: false, error: "Event not found" };

  const { error } = await sb.from("ticket_tiers").insert({
    event_id:    v.event_id,
    name:        v.name,
    description: v.description || null,
    price_paise: Math.round(v.price_rupees * 100),
    capacity:    typeof v.capacity === "number" ? v.capacity : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/events/${v.event_id}`);
  return { ok: true };
}

/**
 * Submit for review (draft → published) or take offline (published → draft).
 *
 * Publishing does NOT make the event public on its own — it enters the
 * super-admin approval queue. The event is only publicly visible when
 * status='published' AND approval_status='approved'.
 *
 * · If already approved → re-publishing puts it straight back live.
 * · If pending/rejected → publishing (re)submits it for review (pending).
 */
export async function toggleEventPublishedAction(eventId: string): Promise<void> {
  const sb = await getSupabaseServerClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data: ev } = await sb
    .from("events")
    .select("status, approval_status")
    .eq("id", eventId)
    .eq("organiser_id", user.id)
    .maybeSingle();
  if (!ev) return;

  const goingLive = ev.status !== "published";
  const update: Record<string, unknown> = {
    status: goingLive ? "published" : "draft",
    updated_by: user.id,
  };
  // Submitting for review: if not already approved, (re)queue as pending.
  if (goingLive && ev.approval_status !== "approved") {
    update.approval_status = "pending";
    update.rejection_reason = null;
  }

  await sb.from("events").update(update).eq("id", eventId).eq("organiser_id", user.id);

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/admin");
}
