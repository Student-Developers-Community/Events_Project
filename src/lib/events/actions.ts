"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { eventCreateSchema, tierCreateSchema, parseQuestionsField, parseCollegesField } from "./schemas";
import { slugify, withRandomSuffix } from "./slug";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEventDescription, type DescriptionInput, type DescriptionResult } from "@/lib/ai/generate-description";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Parse the hackathon-related fields from the event form. */
function parseHackathonFields(formData: FormData) {
  const isHack = formData.get("is_hackathon") === "on";
  const teamSize = Number(formData.get("team_size"));
  const fee = Number(formData.get("entry_fee_rupees"));
  const mode = String(formData.get("eligibility_mode") ?? "open");
  const eligibility = isHack && mode === "colleges" ? "colleges" : "open";
  const allowOthers = eligibility === "colleges" && formData.get("allow_others") === "on";
  const othersQuota = Number(formData.get("others_quota"));
  return {
    is_hackathon: isHack,
    team_size: isHack && Number.isFinite(teamSize) && teamSize >= 1 ? Math.min(20, Math.floor(teamSize)) : null,
    eligibility_mode: eligibility,
    entry_fee_paise: isHack && Number.isFinite(fee) && fee > 0 ? Math.round(fee * 100) : 0,
    allow_others: allowOthers,
    others_quota: allowOthers && Number.isInteger(othersQuota) && othersQuota > 0 ? othersQuota : null,
  };
}

/** Replace an event's allowed-colleges list to match the submitted form. */
async function syncColleges(
  sb: SupabaseClient,
  eventId: string,
  hack: { is_hackathon: boolean; eligibility_mode: string },
  formData: FormData,
) {
  await sb.from("event_colleges").delete().eq("event_id", eventId);
  if (!hack.is_hackathon || hack.eligibility_mode !== "colleges") return;
  const colleges = parseCollegesField(formData.get("colleges"));
  if (colleges.length > 0) {
    await sb.from("event_colleges").insert(
      colleges.map((c) => ({ event_id: eventId, name: c.name, team_quota: c.team_quota })),
    );
  }
}

/** Generate an event description with AI (organiser-gated). */
export async function generateDescriptionAction(input: DescriptionInput): Promise<DescriptionResult> {
  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to use AI generation." };
  return generateEventDescription(input);
}

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

  // Can't create an event in the past.
  if (new Date(v.starts_at).getTime() < Date.now()) {
    return { ok: false, error: "Event start date can't be in the past." };
  }

  const questions = parseQuestionsField(formData.get("questions"));
  const hack = parseHackathonFields(formData);

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
        questions,
        is_hackathon: hack.is_hackathon,
        team_size: hack.team_size,
        eligibility_mode: hack.eligibility_mode,
        entry_fee_paise: hack.entry_fee_paise,
        allow_others: hack.allow_others,
        others_quota: hack.others_quota,
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

  await syncColleges(sb, newEventId, hack, formData);

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${newEventId}`);
}

/**
 * Rehost: duplicate an existing event into a fresh DRAFT (owner only).
 * Copies content, questions and ticket tiers; resets dates to a placeholder
 * (organiser sets the real future date on the edit page) and sold counts to 0.
 * The new event starts as draft → publish → approval → live, like any other.
 */
export async function duplicateEventAction(eventId: string): Promise<void> {
  const sb = await getSupabaseServerClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data: src } = await sb
    .from("events")
    .select("title, subtitle, description, category, is_online, venue_name, venue_address, city, online_url, total_capacity, cover_image_url, contact_email, contact_phone, questions, timezone, is_hackathon, team_size, eligibility_mode, entry_fee_paise, allow_others, others_quota")
    .eq("id", eventId).eq("organiser_id", user.id).maybeSingle();
  if (!src) return;

  // Placeholder future window; organiser picks the real date on /edit.
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const baseSlug = slugify(src.title) || withRandomSuffix("event");
  let slug = withRandomSuffix(baseSlug);
  let newId: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await sb.from("events").insert({
      organiser_id: user.id,
      slug,
      title: src.title,
      subtitle: src.subtitle,
      description: src.description,
      category: src.category,
      status: "draft",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      timezone: src.timezone,
      is_online: src.is_online,
      venue_name: src.venue_name,
      venue_address: src.venue_address,
      city: src.city,
      online_url: src.online_url,
      total_capacity: src.total_capacity,
      cover_image_url: src.cover_image_url,
      contact_email: src.contact_email,
      contact_phone: src.contact_phone,
      questions: src.questions ?? [],
      is_hackathon: src.is_hackathon,
      team_size: src.team_size,
      eligibility_mode: src.eligibility_mode,
      entry_fee_paise: src.entry_fee_paise,
      allow_others: src.allow_others,
      others_quota: src.others_quota,
      created_by: user.id,
      updated_by: user.id,
    }).select("id").single();
    if (!error && data) { newId = data.id; break; }
    if (error?.code === "23505" && error.message.includes("slug")) { slug = withRandomSuffix(baseSlug); continue; }
    return;
  }
  if (!newId) return;

  // Copy ticket tiers (fresh rows → sold_count resets to 0).
  const { data: tiers } = await sb
    .from("ticket_tiers")
    .select("name, description, price_paise, capacity, sort_order")
    .eq("event_id", eventId).is("deleted_at", null);
  if (tiers && tiers.length > 0) {
    await sb.from("ticket_tiers").insert(
      tiers.map((t) => ({
        event_id: newId, name: t.name, description: t.description,
        price_paise: t.price_paise, capacity: t.capacity, sort_order: t.sort_order,
      })),
    );
  }

  // Copy allowed colleges (quotas reset — no teams yet).
  const { data: cols } = await sb
    .from("event_colleges").select("name, team_quota").eq("event_id", eventId);
  if (cols && cols.length > 0) {
    await sb.from("event_colleges").insert(
      cols.map((c) => ({ event_id: newId, name: c.name, team_quota: c.team_quota })),
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${newId}/edit`);
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
  const questions = parseQuestionsField(formData.get("questions"));
  const hack = parseHackathonFields(formData);

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await sb
    .from("events")
    .update({
      is_hackathon: hack.is_hackathon,
      team_size: hack.team_size,
      eligibility_mode: hack.eligibility_mode,
      entry_fee_paise: hack.entry_fee_paise,
      allow_others: hack.allow_others,
      others_quota: hack.others_quota,
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
      questions,
      updated_by: user.id,
      // Any organiser edit sends the event back for super-admin approval.
      // approval_status='pending' also hides it from the public view until
      // re-approved (the public view requires approval_status='approved').
      approval_status: "pending",
      approved_at: null,
      approved_by: null,
      rejection_reason: null,
    })
    .eq("id", eventId)
    .eq("organiser_id", user.id);

  if (error) return { ok: false, error: error.message };

  await syncColleges(sb, eventId, hack, formData);

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
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

  // Changing tiers is an edit too → send back for approval (hides from public
  // until re-approved). Only matters if it was previously approved.
  await sb.from("events")
    .update({ approval_status: "pending", approved_at: null, approved_by: null, rejection_reason: null })
    .eq("id", v.event_id).eq("organiser_id", user.id).eq("approval_status", "approved");

  revalidatePath(`/dashboard/events/${v.event_id}`);
  revalidatePath("/events");
  revalidatePath("/admin/events");
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
