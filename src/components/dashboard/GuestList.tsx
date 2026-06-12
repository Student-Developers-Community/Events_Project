"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { inviteGuestsAction, type InviteResult } from "@/lib/invitations/actions";

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  token: string;
  status: "invited" | "accepted" | "declined";
  created_at: string;
};

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  invited:  { bg: "rgba(255,255,255,.06)", color: "var(--muted)",   label: "INVITED" },
  accepted: { bg: "rgba(124,92,255,.15)",  color: "var(--accent)",  label: "ACCEPTED" },
  declined: { bg: "rgba(239,68,68,.12)",   color: "#fca5a5",        label: "DECLINED" },
};

function SendBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-grad" style={{ padding: ".6rem 1.2rem", fontSize: "13.5px", opacity: pending ? 0.6 : 1 }}>
      {pending ? "Sending…" : "Send invites"}
    </button>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      }}
      className="text-[11.5px]"
      style={{ color: copied ? "var(--accent-3)" : "var(--accent-2)" }}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}

export default function GuestList({
  eventId,
  invitations,
  appUrl,
}: {
  eventId: string;
  invitations: Invitation[];
  appUrl: string;
}) {
  const [state, action] = useActionState<InviteResult | undefined, FormData>(inviteGuestsAction, undefined);
  const accepted = invitations.filter((i) => i.status === "accepted").length;

  return (
    <section className="mb-9">
      <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
        <h2 className="sec-title text-2xl">Guest list</h2>
        <span className="text-[12.5px]" style={{ color: "var(--dim)" }}>
          {invitations.length} invited · {accepted} accepted
        </span>
      </div>
      <p className="text-[13.5px] mb-5" style={{ color: "var(--muted)" }}>
        Invite guests by email. They get a link to accept or decline; on accept they get a QR ticket.
      </p>

      {/* Invite form */}
      <form action={action} className="card-base p-5 mb-5 flex flex-col gap-3">
        <input type="hidden" name="event_id" value={eventId} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Email addresses (comma or newline separated)</span>
          <textarea
            name="emails"
            rows={3}
            required
            placeholder="alice@example.com, bob@example.com"
            className="px-3 py-2.5 rounded-md text-sm outline-none resize-vertical"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font)" }}
          />
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <SendBtn />
          {state && !state.ok && <span className="text-[12.5px]" style={{ color: "#fca5a5" }}>{state.error}</span>}
          {state?.ok && (
            <span className="text-[12.5px]" style={{ color: "var(--accent-3)" }}>
              {state.invited} invited{state.skipped ? ` · ${state.skipped} already invited` : ""}{state.failed ? ` · ${state.failed} email(s) failed to send` : ""}
            </span>
          )}
        </div>
      </form>

      {/* List */}
      {invitations.length === 0 ? (
        <div className="card-base p-8 text-center" style={{ borderStyle: "dashed" }}>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>No guests invited yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invitations.map((inv) => {
            const s = STATUS[inv.status] ?? STATUS.invited;
            return (
              <div key={inv.id} className="card-base p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] truncate">{inv.name || inv.email}</p>
                  {inv.name && <p className="text-[12px] truncate" style={{ color: "var(--muted)" }}>{inv.email}</p>}
                </div>
                <CopyLink url={`${appUrl}/invite/${inv.token}`} />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
