"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type HackResult = { ok: true } | { ok: false; error: string };

/** Edit a college's team quota (organiser). RLS limits this to owned events. */
export async function updateCollegeQuotaAction(_: HackResult | undefined, formData: FormData): Promise<HackResult> {
  const collegeId = String(formData.get("college_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const quota = Number(formData.get("team_quota"));
  if (!collegeId) return { ok: false, error: "Missing college id" };
  if (!Number.isInteger(quota) || quota < 1) return { ok: false, error: "Quota must be a whole number ≥ 1" };

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await sb.from("event_colleges").update({ team_quota: quota }).eq("id", collegeId);
  if (error) return { ok: false, error: error.message };
  if (eventId) revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

/** Add a college + quota to a hackathon (organiser). */
export async function addCollegeAction(_: HackResult | undefined, formData: FormData): Promise<HackResult> {
  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const quota = Number(formData.get("team_quota"));
  if (!eventId) return { ok: false, error: "Missing event id" };
  if (!name) return { ok: false, error: "College name required" };
  if (!Number.isInteger(quota) || quota < 1) return { ok: false, error: "Quota must be ≥ 1" };

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await sb.from("event_colleges").insert({ event_id: eventId, name, team_quota: quota });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That college is already added." };
    return { ok: false, error: error.message };
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

/** Remove a college (organiser). */
export async function deleteCollegeAction(formData: FormData): Promise<void> {
  const collegeId = String(formData.get("college_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!collegeId) return;
  const sb = await getSupabaseServerClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("event_colleges").delete().eq("id", collegeId);
  if (eventId) revalidatePath(`/dashboard/events/${eventId}`);
}
