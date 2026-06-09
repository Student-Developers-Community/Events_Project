"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { createTierAction, type ActionResult } from "@/lib/events/actions";

const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-grad"
      style={{ padding: ".65rem 1.2rem", fontSize: "13.5px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Adding…" : "Add tier"}
    </button>
  );
}

export default function TierAddForm({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(createTierAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on success
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Tier name</span>
          <input name="name" required placeholder="General" className="px-3 py-2 rounded-md text-sm outline-none" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Price (₹) · 0 = free</span>
          <input name="price_rupees" type="number" min="0" step="1" required placeholder="499" className="px-3 py-2 rounded-md text-sm outline-none" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Capacity (optional)</span>
          <input name="capacity" type="number" min="1" placeholder="100" className="px-3 py-2 rounded-md text-sm outline-none" style={fieldStyle} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Description (optional)</span>
        <input name="description" placeholder="Includes meals, swag, certificate" className="px-3 py-2 rounded-md text-sm outline-none" style={fieldStyle} />
      </label>

      {state && !state.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}
        >
          {state.error}
        </div>
      )}

      <div>
        <Submit />
      </div>
    </form>
  );
}
