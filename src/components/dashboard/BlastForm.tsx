"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Megaphone } from "lucide-react";
import { postBlastAction, deleteBlastAction, type BlastResult } from "@/lib/blasts/actions";

type Blast = { id: string; message: string; created_at: string };

function PostBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-grad" style={{ padding: ".6rem 1.3rem", fontSize: "13.5px", opacity: pending ? 0.6 : 1 }}>
      {pending ? "Posting…" : "Post announcement"}
    </button>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24); if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BlastForm({ eventId, blasts }: { eventId: string; blasts: Blast[] }) {
  const [state, action] = useActionState<BlastResult | undefined, FormData>(postBlastAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { if (state?.ok) formRef.current?.reset(); }, [state]);

  return (
    <section className="mb-9">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={18} strokeWidth={2} style={{ color: "var(--accent)" }} />
        <h2 className="sec-title text-2xl">Announcements</h2>
      </div>
      <p className="text-[13.5px] mb-5" style={{ color: "var(--muted)" }}>
        Post updates for this event. They show on the public event page for everyone who registered to see.
      </p>

      <form ref={formRef} action={action} className="card-base p-5 mb-5 flex flex-col gap-3">
        <input type="hidden" name="event_id" value={eventId} />
        <textarea
          name="message"
          rows={3}
          required
          maxLength={2000}
          placeholder="e.g. Doors open at 9 AM. Bring your laptop and charger. WiFi details will be shared on arrival."
          className="px-3 py-2.5 rounded-md text-sm outline-none resize-vertical"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font)" }}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <PostBtn />
          {state && !state.ok && <span className="text-[12.5px]" style={{ color: "#fca5a5" }}>{state.error}</span>}
          {state?.ok && <span className="text-[12.5px]" style={{ color: "var(--accent-3)" }}>Posted ✓</span>}
        </div>
      </form>

      {blasts.length === 0 ? (
        <div className="card-base p-8 text-center" style={{ borderStyle: "dashed" }}>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {blasts.map((b) => (
            <div key={b.id} className="card-base p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13.5px] flex-1 whitespace-pre-wrap" style={{ color: "var(--text)" }}>{b.message}</p>
                <form action={deleteBlastAction}>
                  <input type="hidden" name="blast_id" value={b.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <button type="submit" className="text-[11.5px] shrink-0" style={{ color: "#fca5a5" }}>Delete</button>
                </form>
              </div>
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--dim)" }}>{timeAgo(b.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
