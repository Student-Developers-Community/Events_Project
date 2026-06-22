"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { registerTeamAction, type TeamResult } from "@/lib/registrations/actions";
import { formatINR } from "@/lib/format";

type College = { name: string; team_quota: number };
type Member = { name: string; email: string };

const fieldStyle = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-grad w-full" style={{ padding: ".95rem", fontSize: "15px", opacity: pending ? 0.6 : 1 }}>
      {pending ? "Registering team…" : label}
    </button>
  );
}

export default function TeamRegistrationForm({
  eventId,
  eventSlug,
  teamSize,
  entryFeePaise,
  eligibilityMode,
  allowOthers,
  colleges,
}: {
  eventId: string;
  eventSlug: string;
  teamSize: number;
  entryFeePaise: number;
  eligibilityMode: "open" | "colleges";
  allowOthers: boolean;
  colleges: College[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(
    Array.from({ length: teamSize }, () => ({ name: "", email: "" })),
  );
  const [collegeChoice, setCollegeChoice] = useState("");
  const [otherName, setOtherName] = useState("");
  const collegeValue = collegeChoice === "__others__" ? otherName.trim() : collegeChoice;
  const setMember = (i: number, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const [state, formAction] = useActionState<TeamResult | undefined, FormData>(
    async (prev, fd) => {
      fd.set("members", JSON.stringify(members.map((m) => ({ name: m.name.trim(), email: m.email.trim() }))));
      const result = await registerTeamAction(prev, fd);
      if (result.ok) router.push(`/events/${eventSlug}/register/success?qr=${encodeURIComponent(result.qr_token)}`);
      return result;
    },
    undefined,
  );

  const feeLabel = entryFeePaise === 0 ? "Free entry" : `${formatINR(entryFeePaise)} per team`;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="event_id" value={eventId} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
          Team of <b style={{ color: "var(--text)" }}>{teamSize}</b> · the team lead registers everyone
        </p>
        <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ background: entryFeePaise === 0 ? "rgba(22,163,74,.15)" : "rgba(124,92,255,.12)", color: entryFeePaise === 0 ? "#86efac" : "var(--accent)" }}>
          {feeLabel}
        </span>
      </div>

      <Field label="Team name *">
        <input name="team_name" required maxLength={120} placeholder="e.g. Null Pointers" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
      </Field>

      {eligibilityMode === "colleges" ? (
        <Field label="College *">
          <input type="hidden" name="college" value={collegeValue} />
          <select
            required
            value={collegeChoice}
            onChange={(e) => setCollegeChoice(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none"
            style={fieldStyle}
          >
            <option value="" disabled>Select your college…</option>
            {colleges.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            {allowOthers && <option value="__others__">Others (not listed)</option>}
          </select>
          {collegeChoice === "__others__" && (
            <input
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              required
              maxLength={120}
              placeholder="Type your college name"
              className="w-full mt-2 px-3.5 py-2.5 rounded-md text-sm outline-none"
              style={fieldStyle}
            />
          )}
        </Field>
      ) : (
        <Field label="College / Organisation (optional)">
          <input name="college" maxLength={120} placeholder="Your college" className="w-full px-3.5 py-2.5 rounded-md text-sm outline-none" style={fieldStyle} />
        </Field>
      )}

      {/* Members — first is the lead */}
      <div className="flex flex-col gap-4">
        {members.map((m, i) => (
          <div key={i} className="rounded-lg p-4" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <p className="text-[12px] font-semibold mb-2.5" style={{ color: i === 0 ? "var(--accent-3)" : "var(--dim)" }}>
              {i === 0 ? "Team Lead" : `Member ${i + 1}`}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={m.name}
                onChange={(e) => setMember(i, { name: e.target.value })}
                required
                maxLength={120}
                placeholder="Full name"
                className="px-3.5 py-2.5 rounded-md text-sm outline-none"
                style={fieldStyle}
              />
              <input
                value={m.email}
                onChange={(e) => setMember(i, { email: e.target.value })}
                required
                type="email"
                placeholder="Email"
                className="px-3.5 py-2.5 rounded-md text-sm outline-none"
                style={fieldStyle}
              />
            </div>
            {i === 0 && (
              <input
                name="lead_phone"
                required
                placeholder="Lead phone (WhatsApp)"
                className="w-full mt-3 px-3.5 py-2.5 rounded-md text-sm outline-none"
                style={fieldStyle}
              />
            )}
          </div>
        ))}
      </div>

      {state && !state.ok && (
        <div className="px-3 py-2 rounded-md text-[13px]" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5" }}>
          {state.error}
        </div>
      )}

      <Submit label={entryFeePaise === 0 ? "Register team — get QRs" : `Register team · ${formatINR(entryFeePaise)}`} />

      <p className="text-[11px] text-center" style={{ color: "var(--dim)" }}>
        Each member gets their own QR ticket by email.
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
