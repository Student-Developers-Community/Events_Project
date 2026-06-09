"use client";

/**
 * Generic add form wrapper. Used by speakers / sponsors / agenda / etc.
 * Children define the input fields; the wrapper provides:
 *   · useActionState handling
 *   · submit button with pending state
 *   · error pill
 *   · auto-reset on success
 */
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { ok: true } | { ok: false; error: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-grad"
      style={{ padding: ".7rem 1.2rem", fontSize: "13.5px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function AddForm({
  action,
  submitLabel,
  children,
  hiddenInputs,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: React.ReactNode;
  hiddenInputs?: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {hiddenInputs && Object.entries(hiddenInputs).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {state && !state.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}
        >
          {state.error}
        </div>
      )}
      <div>
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

export const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: "var(--dim)" }}>{hint}</span>}
    </label>
  );
}
