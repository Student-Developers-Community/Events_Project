import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "Cancellation & Refund Policy · TechEvent" };

export default function RefundPage() {
  return (
    <LegalShell title="Cancellation & Refund Policy">
      <p>
        This policy explains cancellations and refunds for registrations made through {ENTITY.brand}, operated by{" "}
        <strong>{ENTITY.legalName}</strong>. All amounts are in Indian Rupees (INR/₹).
      </p>

      <h2>1. Registrations Are Non-Refundable</h2>
      <p>
        Once a registration is confirmed and the payment is successful, the amount paid is{" "}
        <strong>non-refundable</strong>. This includes change of mind, inability to attend, late arrival, or
        no-show. Please review the event details, date, and venue carefully before completing your payment.
      </p>

      <h2>2. Free Events</h2>
      <p>Free (₹0) registrations involve no payment, and therefore no refund applies.</p>

      <h2>3. Exception — Event Cancelled by the Organiser</h2>
      <p>
        The only exception is if the <strong>organiser cancels the event entirely</strong>. In that case,
        registered attendees are eligible for a <strong>full refund</strong> of the amount paid. Approved refunds
        are processed within <strong>{ENTITY.refundProcessingDays}</strong> and credited back to the original
        payment method (card / UPI / netbanking). The time for the amount to reflect depends on your bank or
        payment provider.
      </p>

      <h2>4. Rescheduled Events</h2>
      <p>
        If an event is rescheduled, your registration automatically carries over to the new date. No refund is
        provided for rescheduling.
      </p>

      <h2>5. How to Reach Us</h2>
      <p>
        For any payment or cancellation query, email <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a> from your
        registered email address with your event name and registration/QR reference ({ENTITY.supportHours}).
      </p>
    </LegalShell>
  );
}
