import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "Contact Us · TechEvent" };

export default function ContactPage() {
  return (
    <LegalShell title="Contact Us">
      <p>
        {ENTITY.brand} is operated by <strong>{ENTITY.legalName}</strong>. We’re happy to help with registrations,
        refunds, or organiser support.
      </p>

      <h2>Reach Us</h2>
      <ul>
        <li><strong>Email:</strong> <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a></li>
        <li><strong>Phone:</strong> {ENTITY.phone}</li>
        <li><strong>Address:</strong> {ENTITY.address}</li>
        <li><strong>Support hours:</strong> {ENTITY.supportHours}</li>
      </ul>

      <h2>For Refunds</h2>
      <p>
        See our <a href="/refund">Cancellation &amp; Refund Policy</a>, then email us from your registered address
        with your event and registration details.
      </p>
    </LegalShell>
  );
}
