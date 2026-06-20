"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type BlastResult = { ok: true } | { ok: false; error: string };

/** Post an announcement ("blast") on an event. Only the event's organiser. */
export async function postBlastAction(_: BlastResult | undefined, formData: FormData): Promise<BlastResult> {
  const eventId = String(formData.get("event_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!eventId) return { ok: false, error: "Missing event id" };
  if (message.length < 3) return { ok: false, error: "Write an announcement." };
  if (message.length > 2000) return { ok: false, error: "Keep it under 2000 characters." };

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Only the event owner can post.
  const { data: ev } = await sb
    .from("events").select("id, slug")
    .eq("id", eventId).eq("organiser_id", user.id).maybeSingle();
  if (!ev) return { ok: false, error: "Event not found" };

  const { error } = await sb.from("event_blasts").insert({
    event_id: eventId, message, created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/events/${ev.slug}`);
  return { ok: true };
}

/** Delete an announcement (event owner only). */
export async function deleteBlastAction(formData: FormData): Promise<void> {
  const blastId = String(formData.get("blast_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!blastId) return;

  const sb = await getSupabaseServerClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  // RLS already restricts to owned events; delete by id.
  await sb.from("event_blasts").delete().eq("id", blastId);
  if (eventId) revalidatePath(`/dashboard/events/${eventId}`);
}
