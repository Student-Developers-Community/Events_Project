"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateCollegeQuotaAction, addCollegeAction, deleteCollegeAction, type HackResult,
} from "@/lib/hackathon/actions";

export type CollegeFill = { id: string; name: string; team_quota: number; used: number };

const field = { background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font)" };

function Bar({ used, quota }: { used: number; quota: number }) {
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const full = used >= quota;
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: full ? "#fca5a5" : "var(--grad)" }} />
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-outline" style={{ padding: ".4rem .8rem", fontSize: "12px", opacity: pending ? 0.6 : 1 }}>{pending ? "…" : "Save"}</button>;
}

function CollegeRow({ eventId, c }: { eventId: string; c: CollegeFill }) {
  const [state, action] = useActionState<HackResult | undefined, FormData>(updateCollegeQuotaAction, undefined);
  const full = c.used >= c.team_quota;
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-1 gap-2 flex-wrap">
        <span style={{ color: "var(--text)" }}>{c.name}</span>
        <span style={{ color: full ? "#fca5a5" : "var(--muted)" }}>
          {c.used}/{c.team_quota} {full ? "· full" : `· ${c.team_quota - c.used} left`}
        </span>
      </div>
      <Bar used={c.used} quota={c.team_quota} />
      <div className="flex items-center gap-2 mt-1.5">
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="college_id" value={c.id} />
          <input type="hidden" name="event_id" value={eventId} />
          <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>Quota</span>
          <input name="team_quota" type="number" min={c.used} defaultValue={c.team_quota} className="w-20 px-2 py-1 rounded-md text-[12.5px] outline-none" style={field} />
          <SaveBtn />
        </form>
        {state?.ok && <span className="text-[11.5px]" style={{ color: "var(--accent-3)" }}>Saved ✓</span>}
        {state && !state.ok && <span className="text-[11.5px]" style={{ color: "#fca5a5" }}>{state.error}</span>}
        <form action={deleteCollegeAction} className="ml-auto">
          <input type="hidden" name="college_id" value={c.id} />
          <input type="hidden" name="event_id" value={eventId} />
          <button type="submit" className="text-[11.5px]" style={{ color: "#fca5a5" }}>Remove</button>
        </form>
      </div>
    </div>
  );
}

function AddCollege({ eventId }: { eventId: string }) {
  const [state, action] = useActionState<HackResult | undefined, FormData>(addCollegeAction, undefined);
  return (
    <form action={action} className="flex items-end gap-2 flex-wrap pt-3" style={{ borderTop: "1px dashed var(--border)" }}>
      <input type="hidden" name="event_id" value={eventId} />
      <input name="name" required placeholder="Add a college" className="flex-1 min-w-[160px] px-3 py-2 rounded-md text-[13px] outline-none" style={field} />
      <input name="team_quota" type="number" min="1" defaultValue="10" className="w-20 px-3 py-2 rounded-md text-[13px] outline-none" style={field} title="Team quota" />
      <button type="submit" className="btn-grad" style={{ padding: ".5rem 1rem", fontSize: "12.5px" }}>Add</button>
      {state && !state.ok && <span className="text-[11.5px] w-full" style={{ color: "#fca5a5" }}>{state.error}</span>}
    </form>
  );
}

export default function CollegeQuotaManager({
  eventId,
  colleges,
  others,
  exportHref,
}: {
  eventId: string;
  colleges: CollegeFill[];
  others: { quota: number | null; used: number } | null;
  exportHref: string;
}) {
  return (
    <div className="card-base p-5 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--dim)" }}>Seats per college (teams) — live</p>
        <a href={exportHref} className="text-[12px]" style={{ color: "var(--accent-2)" }}>⬇ Export CSV</a>
      </div>

      <div className="flex flex-col gap-4">
        {colleges.map((c) => <CollegeRow key={c.id} eventId={eventId} c={c} />)}

        {others && (
          <div>
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span style={{ color: "var(--text)" }}>Others (unlisted colleges)</span>
              <span style={{ color: others.quota != null && others.used >= others.quota ? "#fca5a5" : "var(--muted)" }}>
                {others.used}{others.quota != null ? `/${others.quota}` : ""} {others.quota != null && others.used >= others.quota ? "· full" : others.quota != null ? `· ${others.quota - others.used} left` : "· no cap"}
              </span>
            </div>
            {others.quota != null && <Bar used={others.used} quota={others.quota} />}
            <p className="text-[11px] mt-1" style={{ color: "var(--dim)" }}>Edit the “Others” quota from the Edit event page.</p>
          </div>
        )}

        <AddCollege eventId={eventId} />
      </div>
    </div>
  );
}
