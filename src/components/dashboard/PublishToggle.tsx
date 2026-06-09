"use client";

import { useTransition } from "react";
import { toggleEventPublishedAction } from "@/lib/events/actions";

export default function PublishToggle({
  eventId,
  isPublished,
  hasTiers,
  isApproved = false,
}: {
  eventId: string;
  isPublished: boolean;
  hasTiers: boolean;
  isApproved?: boolean;
}) {
  const [pending, start] = useTransition();
  const disabled = pending || (!isPublished && !hasTiers);

  // Label depends on whether approval is already granted.
  const label = isPublished
    ? "Take offline"
    : isApproved
      ? "Publish (go live)"
      : "Submit for approval";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => start(() => toggleEventPublishedAction(eventId))}
      className={isPublished ? "btn-outline" : "btn-grad"}
      style={{
        padding: ".65rem 1.2rem",
        fontSize: "13.5px",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      title={!isPublished && !hasTiers ? "Add at least one ticket tier before submitting" : undefined}
    >
      {pending ? "…" : label}
    </button>
  );
}
