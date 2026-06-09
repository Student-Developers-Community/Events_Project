"use client";

import { useState, useTransition } from "react";
import { approveEventAction, rejectEventAction } from "@/lib/admin/actions";

export default function ApprovalControls({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("event_id", eventId);
            start(() => approveEventAction(fd));
          }}
          className="btn-grad"
          style={{ padding: ".55rem 1.1rem", fontSize: "13px", opacity: pending ? 0.6 : 1 }}
        >
          ✓ Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowReject((s) => !s)}
          className="btn-outline"
          style={{ padding: ".55rem 1.1rem", fontSize: "13px", color: "#fca5a5", borderColor: "rgba(239,68,68,.3)" }}
        >
          ✕ Reject
        </button>
      </div>

      {showReject && (
        <div className="flex gap-2 items-stretch mt-1">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to organizer)"
            className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("event_id", eventId);
              fd.set("reason", reason);
              start(() => rejectEventAction(fd));
            }}
            className="btn-outline"
            style={{ padding: ".5rem 1rem", fontSize: "12.5px" }}
          >
            Confirm reject
          </button>
        </div>
      )}
    </div>
  );
}
