"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { eventCreateSchema, parseQuestionsField, parseCollegesField } from "@/lib/events/schemas";

export type AdminResult = { ok: true } | { ok: false; error: string };

/**
 * Super-admin edit of ANY event's content (bypasses organiser ownership).
 * Same shape as updateEventAction so it can be passed to <EventCreateForm
 * submitAction={...} />. Edits content + custom questions (not ticket tiers).
 */
export async function adminUpdateEventAction(
  _: AdminResult | undefined,
  formData: FormData,
): Promise<AdminResult> {
  const user = await requireSuperAdmin();
  const svc = getSupabaseServiceClient();
  if (!svc) return { ok: false, error: "Service role key missing" };

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

  // Hackathon fields (super-admin can edit these too).
  const isHack = formData.get("is_hackathon") === "on";
  const teamSizeNum = Number(formData.get("team_size"));
  const feeNum = Number(formData.get("entry_fee_rupees"));
  const mode = String(formData.get("eligibility_mode") ?? "open");
  const eligibility = isHack && mode === "colleges" ? "colleges" : "open";
  const allowOthers = eligibility === "colleges" && formData.get("allow_others") === "on";
  const othersQuotaNum = Number(formData.get("others_quota"));

  const { error } = await svc.from("events").update({
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
    is_hackathon: isHack,
    team_size: isHack && Number.isFinite(teamSizeNum) && teamSizeNum >= 1 ? Math.min(20, Math.floor(teamSizeNum)) : null,
    eligibility_mode: eligibility,
    entry_fee_paise: isHack && Number.isFinite(feeNum) && feeNum > 0 ? Math.round(feeNum * 100) : 0,
    allow_others: allowOthers,
    others_quota: allowOthers && Number.isInteger(othersQuotaNum) && othersQuotaNum > 0 ? othersQuotaNum : null,
    updated_by: user.id,
  }).eq("id", eventId);

  if (error) return { ok: false, error: error.message };

  // Sync allowed colleges (replace the set).
  await svc.from("event_colleges").delete().eq("event_id", eventId);
  if (isHack && eligibility === "colleges") {
    const colleges = parseCollegesField(formData.get("colleges"));
    if (colleges.length > 0) {
      await svc.from("event_colleges").insert(
        colleges.map((c) => ({ event_id: eventId, name: c.name, team_quota: c.team_quota })),
      );
    }
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect(`/admin/events/${eventId}`);
}

async function svcOrThrow() {
  const user = await requireSuperAdmin(); // gate: redirects if not super admin
  const svc = getSupabaseServiceClient();
  if (!svc) throw new Error("Service role key missing");
  return { svc, user };
}

/** Approve an event → it becomes publicly visible (if published). */
export async function approveEventAction(formData: FormData): Promise<void> {
  const { svc, user } = await svcOrThrow();
  const id = String(formData.get("event_id") ?? "");
  if (!id) return;

  await svc.from("events").update({
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: user.id,
    rejection_reason: null,
  }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

/** Reject an event with a reason → organizer sees why. */
export async function rejectEventAction(formData: FormData): Promise<void> {
  const { svc } = await svcOrThrow();
  const id = String(formData.get("event_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Not specified";
  if (!id) return;

  await svc.from("events").update({
    approval_status: "rejected",
    rejection_reason: reason,
  }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

/** Unpublish (force offline) any event. */
export async function adminUnpublishEventAction(formData: FormData): Promise<void> {
  const { svc } = await svcOrThrow();
  const id = String(formData.get("event_id") ?? "");
  if (!id) return;
  await svc.from("events").update({ status: "draft" }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

/** Soft-delete any event. */
export async function adminDeleteEventAction(formData: FormData): Promise<void> {
  const { svc } = await svcOrThrow();
  const id = String(formData.get("event_id") ?? "");
  if (!id) return;
  await svc.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

/** Remove a registration from an event (super admin). */
export async function adminDeleteRegistrationAction(formData: FormData): Promise<void> {
  const { svc } = await svcOrThrow();
  const id = String(formData.get("registration_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!id) return;
  await svc.from("registrations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (eventId) revalidatePath(`/admin/events/${eventId}`);
}

// ── Ticket tiers (super-admin can manage tiers on any event) ─────────────────

type TierFields =
  | { ok: false; error: string }
  | { ok: true; name: string; price_paise: number; capacity: number | null };

function parseTierFields(formData: FormData): TierFields {
  const name = String(formData.get("name") ?? "").trim();
  const priceRupees = Number(formData.get("price_rupees") ?? "");
  const capRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capRaw === "" ? null : Number(capRaw);
  if (!name) return { ok: false, error: "Tier name required" };
  if (!Number.isFinite(priceRupees) || priceRupees < 0) return { ok: false, error: "Enter a valid price (₹0 = free)" };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) return { ok: false, error: "Capacity must be a positive whole number" };
  return { ok: true, name, price_paise: Math.round(priceRupees * 100), capacity };
}

function revalidateTier(eventId: string) {
  if (!eventId) return;
  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

/** Add a ticket tier to any event. */
export async function adminCreateTierAction(_: AdminResult | undefined, formData: FormData): Promise<AdminResult> {
  const { svc } = await svcOrThrow();
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return { ok: false, error: "Missing event id" };
  const f = parseTierFields(formData);
  if (!f.ok) return { ok: false, error: f.error };

  const { error } = await svc.from("ticket_tiers").insert({
    event_id: eventId, name: f.name,
    description: String(formData.get("description") ?? "").trim() || null,
    price_paise: f.price_paise, capacity: f.capacity,
  });
  if (error) return { ok: false, error: error.message };
  revalidateTier(eventId);
  return { ok: true };
}

/** Edit a ticket tier (name, price, capacity, active) on any event. */
export async function adminUpdateTierAction(_: AdminResult | undefined, formData: FormData): Promise<AdminResult> {
  const { svc } = await svcOrThrow();
  const tierId = String(formData.get("tier_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!tierId) return { ok: false, error: "Missing tier id" };
  const f = parseTierFields(formData);
  if (!f.ok) return { ok: false, error: f.error };

  const { error } = await svc.from("ticket_tiers").update({
    name: f.name, price_paise: f.price_paise, capacity: f.capacity,
    is_active: formData.get("is_active") === "on",
  }).eq("id", tierId);
  if (error) return { ok: false, error: error.message };
  revalidateTier(eventId);
  return { ok: true };
}

/** Soft-delete a ticket tier on any event. */
export async function adminDeleteTierAction(formData: FormData): Promise<void> {
  const { svc } = await svcOrThrow();
  const tierId = String(formData.get("tier_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!tierId) return;
  await svc.from("ticket_tiers").update({ deleted_at: new Date().toISOString() }).eq("id", tierId);
  revalidateTier(eventId);
}
