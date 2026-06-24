"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { createEventAction, updateEventAction, generateDescriptionAction, type ActionResult } from "@/lib/events/actions";
import type { EventQuestion, QuestionType } from "@/lib/db/types";
import ImageUpload from "./ImageUpload";

const CATEGORIES = [
  { value: "hackathon",  label: "Hackathon" },
  { value: "workshop",   label: "Workshop" },
  { value: "conference", label: "Conference" },
  { value: "meetup",     label: "Meetup" },
  { value: "demo_day",   label: "Demo day" },
  { value: "other",      label: "Other" },
];

const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

export type EventFormDefaults = {
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_online?: boolean;
  venue_name?: string | null;
  city?: string | null;
  online_url?: string | null;
  total_capacity?: number | null;
  cover_image_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  questions?: EventQuestion[] | null;
  is_hackathon?: boolean;
  team_size?: number | null;
  eligibility_mode?: "open" | "colleges";
  entry_fee_rupees?: number | null;
  colleges?: { name: string; team_quota: number }[];
  allow_others?: boolean;
  others_quota?: number | null;
};

type CollegeRow = { name: string; team_quota: number };

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text",     label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "url",      label: "URL (e.g. LinkedIn)" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
];

function newQuestionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `q_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

/** ISO → "YYYY-MM-DDTHH:mm" in local time, for datetime-local prefill. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Now, as a datetime-local string — used as the `min` so past dates can't be picked. */
function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-grad" style={{ padding: ".85rem 1.8rem", fontSize: "15px", opacity: pending ? 0.6 : 1 }}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function EventCreateForm({
  mode = "create",
  eventId,
  defaults = {},
  submitAction,
}: {
  mode?: "create" | "edit";
  eventId?: string;
  defaults?: EventFormDefaults;
  /** Override the server action (e.g. super-admin editing any event). */
  submitAction?: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const action = submitAction ?? (mode === "edit" ? updateEventAction : createEventAction);
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);
  const [isOnline, setIsOnline] = useState(defaults.is_online ?? false);
  const [questions, setQuestions] = useState<EventQuestion[]>(defaults.questions ?? []);

  // ── Hackathon settings ──
  const [isHackathon, setIsHackathon] = useState(defaults.is_hackathon ?? false);
  const [teamSize, setTeamSize] = useState<string>(defaults.team_size ? String(defaults.team_size) : "4");
  const [entryFee, setEntryFee] = useState<string>(defaults.entry_fee_rupees != null ? String(defaults.entry_fee_rupees) : "0");
  const [restrictColleges, setRestrictColleges] = useState((defaults.eligibility_mode ?? "open") === "colleges");
  const [colleges, setColleges] = useState<CollegeRow[]>(defaults.colleges ?? []);
  const [allowOthers, setAllowOthers] = useState(defaults.allow_others ?? false);
  const [othersQuota, setOthersQuota] = useState<string>(defaults.others_quota != null ? String(defaults.others_quota) : "10");
  const addCollege = () => setColleges((cs) => [...cs, { name: "", team_quota: 10 }]);
  const updateCollege = (i: number, patch: Partial<CollegeRow>) =>
    setColleges((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCollege = (i: number) => setColleges((cs) => cs.filter((_, idx) => idx !== i));

  const formRef = useRef<HTMLFormElement>(null);
  // Compute the date-picker `min` on the client only — using new Date() during
  // render causes a server/client hydration mismatch that breaks the form.
  const [minDate, setMinDate] = useState("");
  useEffect(() => { setMinDate(nowLocalInput()); }, []);
  const [description, setDescription] = useState(defaults.description ?? "");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function generateDescription() {
    setAiError(null);
    const fd = formRef.current ? new FormData(formRef.current) : null;
    const title = String(fd?.get("title") ?? "").trim();
    if (title.length < 3) { setAiError("Add an event title first."); return; }
    setAiBusy(true);
    try {
      const res = await generateDescriptionAction({
        title,
        category: String(fd?.get("category") ?? ""),
        subtitle: String(fd?.get("subtitle") ?? ""),
        venue: String(fd?.get("venue_name") ?? ""),
        city: String(fd?.get("city") ?? ""),
        isOnline: fd?.get("is_online") === "on",
        startsAt: String(fd?.get("starts_at") ?? ""),
      });
      if (res.ok) setDescription(res.text);
      else setAiError(res.error);
    } catch {
      setAiError("Generation failed. Try again.");
    } finally {
      setAiBusy(false);
    }
  }

  const addQuestion = () =>
    setQuestions((qs) =>
      qs.length >= 15 ? qs : [...qs, { id: newQuestionId(), label: "", type: "text", required: false }],
    );
  const updateQuestion = (id: string, patch: Partial<EventQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQuestion = (id: string) =>
    setQuestions((qs) => qs.filter((q) => q.id !== id));

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {mode === "edit" && eventId && <input type="hidden" name="event_id" value={eventId} />}
      {/* Custom questions serialised as JSON — parsed server-side. Empty labels dropped. */}
      <input
        type="hidden"
        name="questions"
        value={JSON.stringify(questions.filter((q) => q.label.trim() !== ""))}
      />

      {/* Hackathon settings serialised for the server action. */}
      {isHackathon && <input type="hidden" name="is_hackathon" value="on" />}
      <input type="hidden" name="team_size" value={teamSize} />
      <input type="hidden" name="entry_fee_rupees" value={entryFee} />
      <input type="hidden" name="eligibility_mode" value={restrictColleges ? "colleges" : "open"} />
      {restrictColleges && allowOthers && <input type="hidden" name="allow_others" value="on" />}
      <input type="hidden" name="others_quota" value={othersQuota} />
      <input
        type="hidden"
        name="colleges"
        value={JSON.stringify(colleges.filter((c) => c.name.trim() !== "").map((c) => ({ name: c.name.trim(), team_quota: Number(c.team_quota) || 1 })))}
      />

      <Field label="Event title *">
        <input name="title" required defaultValue={defaults.title ?? ""} placeholder="e.g. Hack for Hyderabad" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      <Field label="Tagline (one-liner)">
        <input name="subtitle" defaultValue={defaults.subtitle ?? ""} placeholder="What's the hook?" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>Description</span>
          <button
            type="button"
            onClick={generateDescription}
            disabled={aiBusy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold"
            style={{
              background: "rgba(124,92,255,.12)",
              border: "1px solid rgba(124,92,255,.3)",
              color: "var(--accent-3)",
              cursor: aiBusy ? "wait" : "pointer",
              opacity: aiBusy ? 0.7 : 1,
            }}
          >
            <Sparkles size={13} strokeWidth={2.2} />
            {aiBusy ? "Generating…" : "Generate with AI"}
          </button>
        </span>
        <textarea
          name="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the schedule, who is it for, what to expect… or click ✨ Generate with AI"
          className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none resize-vertical"
          style={fieldStyle}
        />
        {aiError && <span className="text-[12px]" style={{ color: "#fca5a5" }}>{aiError}</span>}
      </label>

      <Field label="Cover image (optional)">
        <ImageUpload defaultUrl={defaults.cover_image_url ?? ""} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category *">
          <select name="category" required defaultValue={defaults.category ?? "hackathon"} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Total capacity (optional)">
          <input name="total_capacity" type="number" min="1" defaultValue={defaults.total_capacity ?? ""} placeholder="300" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Starts at *">
          <input name="starts_at" type="datetime-local" required min={minDate || undefined} defaultValue={toLocalInput(defaults.starts_at)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
        <Field label="Ends at *">
          <input name="ends_at" type="datetime-local" required min={minDate || undefined} defaultValue={toLocalInput(defaults.ends_at)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" name="is_online" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} className="w-4 h-4" />
        <span className="text-[13.5px]" style={{ color: "var(--text)" }}>This is an online event</span>
      </label>

      {isOnline ? (
        <Field label="Online URL *">
          <input name="online_url" type="url" defaultValue={defaults.online_url ?? ""} placeholder="https://meet.google.com/..." className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Venue *">
            <input name="venue_name" defaultValue={defaults.venue_name ?? ""} placeholder="Draper Startup House" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
          </Field>
          <Field label="City *">
            <input name="city" defaultValue={defaults.city ?? ""} placeholder="Hyderabad" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
          </Field>
        </div>
      )}

      {/* Contact */}
      <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[13px] font-semibold mb-1 mt-3" style={{ color: "var(--text)" }}>Contact for attendees</p>
        <p className="text-[12px] mb-3" style={{ color: "var(--dim)" }}>
          Shown in a &quot;Questions?&quot; section so attendees can reach you. Optional but recommended.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact email">
            <input name="contact_email" type="email" defaultValue={defaults.contact_email ?? ""} placeholder="team@yourevent.com" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
          </Field>
          <Field label="Contact phone (WhatsApp)">
            <input name="contact_phone" defaultValue={defaults.contact_phone ?? ""} placeholder="9876543210" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
          </Field>
        </div>
      </div>

      {/* Hackathon settings */}
      <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <label className="flex items-center gap-2.5 cursor-pointer mt-3">
          <input type="checkbox" checked={isHackathon} onChange={(e) => setIsHackathon(e.target.checked)} className="w-4 h-4" />
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>This is a team hackathon</span>
        </label>
        <p className="text-[12px] mt-1 mb-3" style={{ color: "var(--dim)" }}>
          Turns on team registration — a team lead signs up the whole team; each member gets their own QR.
        </p>

        {isHackathon && (
          <div className="flex flex-col gap-4 p-4 rounded-lg" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Team size (members per team) *">
                <input type="number" min="1" max="20" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
              </Field>
              <Field label="Entry fee per team (₹) · 0 = free">
                <input type="number" min="0" step="1" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
              </Field>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={restrictColleges} onChange={(e) => setRestrictColleges(e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px]" style={{ color: "var(--text)" }}>Restrict to specific colleges (with per-college team quotas)</span>
            </label>

            {restrictColleges && (
              <div className="flex flex-col gap-2">
                {colleges.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) => updateCollege(i, { name: e.target.value })}
                      placeholder="College name"
                      className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none"
                      style={fieldStyle}
                    />
                    <input
                      type="number"
                      min="1"
                      value={c.team_quota}
                      onChange={(e) => updateCollege(i, { team_quota: Number(e.target.value) })}
                      className="w-24 px-3 py-2 rounded-md text-[13px] outline-none"
                      style={fieldStyle}
                      title="Team quota"
                    />
                    <span className="text-[12px] shrink-0" style={{ color: "var(--dim)" }}>teams</span>
                    <button type="button" onClick={() => removeCollege(i)} className="text-[12px]" style={{ color: "#fca5a5" }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addCollege} className="btn-outline self-start" style={{ padding: ".45rem .9rem", fontSize: "12.5px" }}>
                  + Add college
                </button>
                {colleges.length === 0 && (
                  <p className="text-[12px]" style={{ color: "#fbbf24" }}>Add at least one college, or turn off the restriction.</p>
                )}

                {/* Others bucket */}
                <div className="mt-2 pt-3" style={{ borderTop: "1px dashed var(--border)" }}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={allowOthers} onChange={(e) => setAllowOthers(e.target.checked)} className="w-4 h-4" />
                    <span className="text-[13px]" style={{ color: "var(--text)" }}>Allow teams from other colleges (an &quot;Others&quot; option)</span>
                  </label>
                  {allowOthers && (
                    <div className="flex items-center gap-2 mt-2 ml-7">
                      <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>Quota for &quot;Others&quot;:</span>
                      <input type="number" min="1" value={othersQuota} onChange={(e) => setOthersQuota(e.target.value)} className="w-24 px-3 py-2 rounded-md text-[13px] outline-none" style={fieldStyle} />
                      <span className="text-[12px]" style={{ color: "var(--dim)" }}>teams</span>
                    </div>
                  )}
                  <p className="text-[12px] mt-1.5 ml-7" style={{ color: "var(--dim)" }}>
                    Teams whose college isn&apos;t listed pick &quot;Others&quot; and type their college name.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom questions for attendees */}
      <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[13px] font-semibold mb-1 mt-3" style={{ color: "var(--text)" }}>Questions for attendees</p>
        <p className="text-[12px] mb-3" style={{ color: "var(--dim)" }}>
          Ask for extra info at registration — LinkedIn URL, GitHub, T-shirt size, etc. Name, email and phone are always collected.
        </p>

        {questions.length > 0 && (
          <div className="flex flex-col gap-3 mb-3">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-md p-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold" style={{ color: "var(--dim)" }}>Q{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="ml-auto text-[12px]"
                    style={{ color: "#fca5a5" }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={q.label}
                  onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                  maxLength={120}
                  placeholder="Question label (e.g. LinkedIn URL)"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
                  style={fieldStyle}
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="px-3 py-2 rounded-md text-[13px] outline-none"
                    style={fieldStyle}
                  >
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {questions.length < 15 && (
          <button type="button" onClick={addQuestion} className="btn-outline" style={{ padding: ".5rem 1rem", fontSize: "13px" }}>
            + Add question
          </button>
        )}
      </div>

      {state && !state.ok && (
        <div className="px-3 py-2 rounded-md text-[13px]" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}>
          {state.error}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Create event"} />
      </div>

      {mode === "create" && (
        <p className="text-[12px]" style={{ color: "var(--dim)" }}>
          Events are created as <b style={{ color: "var(--muted)" }}>drafts</b>. Add ticket tiers, then submit for approval from the event page.
        </p>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      {children}
    </label>
  );
}
