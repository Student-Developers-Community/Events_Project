"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/auth/actions";

type FieldDef = {
  name: string;
  type: "text" | "email" | "password";
  label: string;
  autoComplete?: string;
  placeholder?: string;
};

type Props = {
  fields: FieldDef[];
  submitLabel: string;
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  /** Where to redirect on success — passed through to the Server Action */
  next?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-grad w-full"
      style={{ padding: ".85rem", fontSize: "15px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function AuthForm({ fields, submitLabel, action, next }: Props) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
            {f.label}
          </span>
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            className="px-3.5 py-2.5 rounded-md text-sm outline-none transition-colors focus:border-[var(--accent)]"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "var(--font)",
            }}
          />
        </label>
      ))}

      {state && !state.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{
            background: "rgba(239,68,68,.1)",
            border: "1px solid rgba(239,68,68,.3)",
            color: "#fca5a5",
          }}
        >
          {state.error}
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
