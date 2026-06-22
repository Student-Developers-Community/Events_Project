import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

/**
 * GET /dashboard/events/[id]/colleges/export
 * CSV of per-college team quota / used / remaining (+ an "Others" row).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const sb = await getSupabaseServerClient();
  if (!sb) return new NextResponse("Server not configured", { status: 500 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const { data: ev } = await sb
    .from("events").select("slug, allow_others, others_quota")
    .eq("id", id).eq("organiser_id", user.id).maybeSingle();
  if (!ev) return new NextResponse("Not found", { status: 404 });

  const { data: colleges } = await sb.from("event_colleges").select("name, team_quota").eq("event_id", id).order("name");
  const { data: teams } = await sb.from("event_teams").select("college").eq("event_id", id);
  const teamsList = teams ?? [];
  const allowedSet = new Set((colleges ?? []).map((c) => c.name.toLowerCase()));

  const rows = (colleges ?? []).map((c) => {
    const used = teamsList.filter((t) => (t.college ?? "").toLowerCase() === c.name.toLowerCase()).length;
    return {
      "College": c.name,
      "Team quota": String(c.team_quota),
      "Teams registered": String(used),
      "Remaining": String(Math.max(0, c.team_quota - used)),
    };
  });

  if (ev.allow_others) {
    const used = teamsList.filter((t) => t.college && !allowedSet.has(t.college.toLowerCase())).length;
    rows.push({
      "College": "Others (unlisted)",
      "Team quota": ev.others_quota != null ? String(ev.others_quota) : "No cap",
      "Teams registered": String(used),
      "Remaining": ev.others_quota != null ? String(Math.max(0, ev.others_quota - used)) : "—",
    });
  }

  const headers = ["College", "Team quota", "Teams registered", "Remaining"];
  const csv = toCsv(rows, headers);
  const filename = `${ev.slug}-colleges-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
