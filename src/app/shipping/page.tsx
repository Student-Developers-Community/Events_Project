import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "Shipping & Delivery Policy · TechEvent" };

export default function ShippingPage() {
  return (
    <LegalShell title="Shipping & Delivery Policy">
      <p>
        {ENTITY.brand}, operated by <strong>{ENTITY.legalName}</strong>, sells <strong>digital event
        registrations only</strong>. There are <strong>no physical goods</strong> shipped.
      </p>

      <h2>Digital Delivery</h2>
      <ul>
        <li>On successful registration, your ticket is delivered <strong>instantly by email</strong> as a unique QR code (typically within a few minutes).</li>
        <li>Your ticket is also available anytime on your <a href="/my-tickets">My Tickets</a> page.</li>
        <li>Entry to the event is by scanning this QR code at the venue.</li>
      </ul>

      <h2>No Physical Shipping</h2>
      <p>
        As we deliver only digital tickets/registrations, no shipping charges apply and no items are couriered.
        If you do not receive your ticket email within 30 minutes, check your spam folder or contact{" "}
        <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
      </p>
    </LegalShell>
  );
}
