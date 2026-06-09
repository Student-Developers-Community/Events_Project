"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/auth/super-admin";

export type AdminResult = { ok: true } | { ok: false; error: string };

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
