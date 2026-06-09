"use client";

import { useTransition } from "react";

export default function DeleteButton({
  action,
  id,
  eventId,
  confirmText = "Delete this?",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  eventId: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("event_id", eventId);
        start(() => action(fd));
      }}
      className="text-[11.5px] px-2 py-1 rounded transition-colors hover:bg-[rgba(239,68,68,.1)]"
      style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,.2)" }}
      title="Delete"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
