"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { registerAttendeeAction, type ActionResult } from "@/lib/registrations/actions";
import type { EventQuestion } from "@/lib/db/types";
import { formatINR } from "@/lib/format";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  price_paise: number;
  is_sold_out: boolean;
};

type Props = {
  eventId: string;
  eventSlug: string;
  tiers: Tier[];
  questions: EventQuestion[];
};

const INPUT_TYPE: Record<EventQuestion["type"], string> = {
  text: "text",
  textarea: "text", // rendered as <textarea> below
  url: "url",
  email: "email",
  phone: "tel",
};

const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-grad w-full"
      style={{ padding: ".95rem", fontSize: "15px", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Reserving…" : label}
    </button>
  );
}

export default function RegistrationForm({ eventId, eventSlug, tiers, questions }: Props) {
  const router = useRouter();
  const available = tiers.filter((t) => !t.is_sold_out);
  const [selectedTierId, setSelectedTierId] = useState<string>(available[0]?.id ?? "");

  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const result = await registerAttendeeAction(prev, fd);
      if (result.ok) {
        // Free tickets are confirmed immediately (no payment) → straight to the
        // ticket. Paid tickets go to the pending/payment step.
        const next = result.free
          ? `/events/${eventSlug}/register/success?qr=${encodeURIComponent(result.qr_token)}`
          : `/events/${eventSlug}/register/pending?qr=${encodeURIComponent(result.qr_token)}`;
        router.push(next);
      }
      return result;
    },
    undefined,
  );

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const priceLabel = selectedTier ? formatINR(selectedTier.price_paise) : "—";
  const isFree = selectedTier?.price_paise === 0;
  const ctaLabel = isFree ? "Get free ticket" : `Continue · ${priceLabel}`;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="tier_id"  value={selectedTierId} />

      {/* Tier picker */}
      <div>
        <p className="text-[13px] font-medium mb-2.5" style={{ color: "var(--muted)" }}>Select ticket</p>
        <div className="flex flex-col gap-2">
          {tiers.map((t) => {
            const active = t.id === selectedTierId;
            const disabled = t.is_sold_out;
            return (
              <button
                type="button"
                key={t.id}
                disabled={disabled}
                onClick={() => !disabled && setSelectedTierId(t.id)}
                className="text-left flex items-center gap-3 p-3 rounded-md transition-colors"
                style={{
                  background: active ? "rgba(124, 92, 255,.08)" : "var(--bg-2)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{
                    background: active ? "var(--accent)" : "transparent",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border-2)"}`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px]" style={{ color: "var(--text)" }}>
                    {t.name}
                    {disabled && <span className="ml-2 text-[10px]" style={{ color: "var(--dim)" }}>SOLD OUT</span>}
                  </div>
                  {t.description && (
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>{t.description}</div>
                  )}
                </div>
                <div className="font-bold text-[14px] shrink-0" style={{ color: t.price_paise === 0 ? "#86efac" : "var(--accent)" }}>
                  {formatINR(t.price_paise)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Full name *">
        <input name="attendee_name" required maxLength={120} placeholder="Pavan Kumar" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>
      <Field label="Email *">
        <input name="attendee_email" type="email" required placeholder="you@example.com" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>
      <Field label="Phone (WhatsApp) *">
        <input name="attendee_phone" required placeholder="9876543210" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      {/* Organiser's custom questions. Field name = q_<id>, read server-side. */}
      {questions.map((q) => (
        <Field key={q.id} label={`${q.label}${q.required ? " *" : ""}`}>
          {q.type === "textarea" ? (
            <textarea
              name={`q_${q.id}`}
              required={q.required}
              rows={3}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none resize-vertical"
              style={fieldStyle}
            />
          ) : (
            <input
              name={`q_${q.id}`}
              type={INPUT_TYPE[q.type]}
              required={q.required}
              maxLength={500}
              placeholder={q.type === "url" ? "https://…" : ""}
              className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
              style={fieldStyle}
            />
          )}
        </Field>
      ))}

      {state && !state.ok && (
        <div
          className="px-3 py-2 rounded-md text-[13px]"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}
        >
          {state.error}
        </div>
      )}

      <Submit label={ctaLabel} />

      <p className="text-[11px] text-center" style={{ color: "var(--dim)" }}>
        By continuing, you agree to share your contact details with the event organiser.
      </p>
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
