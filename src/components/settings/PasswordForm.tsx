"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type ActionResult } from "@/lib/settings/actions";

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
      className="btn-outline"
      style={{ padding: ".65rem 1.2rem", fontSize: "13.5px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Updating…" : "Update password"}
    </button>
  );
}

export default function PasswordForm() {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(changePasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>New password</span>
        <input
          name="new_password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          placeholder="At least 8 characters"
          className="px-3 py-2 rounded-md text-sm outline-none"
          style={fieldStyle}
        />
      </label>

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
          style={{ background: "rgba(124, 92, 255,.08)", border: "1px solid rgba(124, 92, 255,.3)", color: "var(--accent-3)" }}
        >
          ✓ {state.message ?? "Password updated"}
        </div>
      )}

      <div>
        <Save />
      </div>
    </form>
  );
}
