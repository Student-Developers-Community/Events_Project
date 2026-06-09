"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction, type ActionResult } from "@/lib/settings/actions";

const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-grad"
      style={{ padding: ".7rem 1.4rem", fontSize: "14px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

type Defaults = {
  display_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
};

export default function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(updateProfileAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Display name *">
          <input
            name="display_name"
            required
            defaultValue={defaults.display_name}
            maxLength={80}
            className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
            style={fieldStyle}
          />
        </Field>
        <Field label="Email" hint="Email change isn't supported yet. Contact support if needed.">
          <input
            value={defaults.email}
            readOnly
            disabled
            className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none cursor-not-allowed"
            style={{ ...fieldStyle, opacity: 0.6 }}
          />
        </Field>
      </div>

      <Field label="Phone" hint="Indian mobile number (10 digits, with or without +91)">
        <input
          name="phone"
          defaultValue={defaults.phone ?? ""}
          placeholder="9876543210"
          className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
          style={fieldStyle}
        />
      </Field>

      <Field label="Bio" hint="Shown on events you host">
        <textarea
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={defaults.bio ?? ""}
          placeholder="One paragraph about you / your org"
          className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none resize-vertical"
          style={fieldStyle}
        />
      </Field>

      <Field label="Avatar URL" hint="Hosted image URL (square works best). Upload coming soon.">
        <input
          name="avatar_url"
          type="url"
          defaultValue={defaults.avatar_url ?? ""}
          placeholder="https://..."
          className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
          style={fieldStyle}
        />
      </Field>

      <Field label="Website">
        <input
          name="website_url"
          type="url"
          defaultValue={defaults.website_url ?? ""}
          placeholder="https://your-site.com"
          className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
          style={fieldStyle}
        />
      </Field>

      {state && !state.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}
        >
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{ background: "rgba(0,255,157,.08)", border: "1px solid rgba(0,255,157,.3)", color: "var(--accent-3)" }}
        >
          ✓ {state.message ?? "Saved"}
        </div>
      )}

      <div>
        <Save />
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: "var(--dim)" }}>{hint}</span>}
    </label>
  );
}
