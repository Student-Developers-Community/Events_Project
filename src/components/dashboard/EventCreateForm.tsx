"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEventAction, updateEventAction, type ActionResult } from "@/lib/events/actions";
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
};

/** ISO → "YYYY-MM-DDTHH:mm" in local time, for datetime-local prefill. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
}: {
  mode?: "create" | "edit";
  eventId?: string;
  defaults?: EventFormDefaults;
}) {
  const action = mode === "edit" ? updateEventAction : createEventAction;
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);
  const [isOnline, setIsOnline] = useState(defaults.is_online ?? false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === "edit" && eventId && <input type="hidden" name="event_id" value={eventId} />}

      <Field label="Event title *">
        <input name="title" required defaultValue={defaults.title ?? ""} placeholder="e.g. Hack for Hyderabad" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      <Field label="Tagline (one-liner)">
        <input name="subtitle" defaultValue={defaults.subtitle ?? ""} placeholder="What's the hook?" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      <Field label="Description">
        <textarea name="description" rows={5} defaultValue={defaults.description ?? ""} placeholder="What's the schedule, who is it for, what to expect..." className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none resize-vertical" style={fieldStyle} />
      </Field>

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
          <input name="starts_at" type="datetime-local" required defaultValue={toLocalInput(defaults.starts_at)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
        <Field label="Ends at *">
          <input name="ends_at" type="datetime-local" required defaultValue={toLocalInput(defaults.ends_at)} className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
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
