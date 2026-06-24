import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "Terms & Conditions · TechEvent" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions">
      <p>
        These Terms &amp; Conditions govern your use of {ENTITY.brand} (the “Platform”), operated by{" "}
        <strong>{ENTITY.legalName}</strong> (“we”, “us”, “our”). By accessing the Platform or registering for any
        event, you agree to these terms. If you do not agree, please do not use the Platform.
      </p>

      <h2>1. About the Platform</h2>
      <p>
        {ENTITY.brand} is an {ENTITY.lob.toLowerCase()} that lets organisers publish events and lets attendees
        discover and register for them. We provide the technology that facilitates event listing, registration,
        ticketing, and entry (QR check-in).
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information when creating an account or registering for an event.</li>
        <li>You are responsible for activity under your account and for keeping your credentials secure.</li>
        <li>Organisers are solely responsible for the events they create, including accuracy, conduct, and delivery.</li>
      </ul>

      <h2>3. Registrations &amp; Tickets</h2>
      <ul>
        <li>All prices are listed in Indian Rupees (INR/₹) on the event page, inclusive of applicable taxes where stated.</li>
        <li>A registration is confirmed once payment (for paid events) is successfully completed; you then receive a unique QR ticket by email.</li>
        <li>Each QR ticket is single-use and must not be shared or duplicated.</li>
        <li>Free events require no payment and are confirmed instantly.</li>
      </ul>

      <h2>4. Delivery of Tickets (Digital Only)</h2>
      <p>
        {ENTITY.brand} sells <strong>digital event registrations only — there are no physical goods and nothing is
        shipped</strong>. Your QR ticket is delivered <strong>instantly by email</strong> on confirmation and is also
        available on your My Tickets page. Entry is by scanning the QR at the venue.
      </p>

      <h2>5. Payments</h2>
      <p>
        Payments for paid events are processed through our third-party payment aggregator (Razorpay). We do not
        store your card or banking details. By making a payment you also agree to the payment provider’s terms.
      </p>

      <h2>6. Cancellations &amp; Refunds</h2>
      <p>
        Cancellations and refunds are governed by our <a href="/refund">Cancellation &amp; Refund Policy</a>.
      </p>

      <h2>7. Acceptable Use</h2>
      <ul>
        <li>Do not use the Platform for unlawful, fraudulent, or restricted activities.</li>
        <li>Do not attempt to disrupt, reverse-engineer, or gain unauthorised access to the Platform.</li>
        <li>We may suspend or remove events or accounts that violate these terms.</li>
      </ul>

      <h2>8. Limitation of Liability</h2>
      <p>
        The Platform facilitates registration but is not the host of events unless explicitly stated. We are not
        liable for an organiser’s acts or omissions, event cancellation by an organiser, or any indirect or
        consequential loss, to the maximum extent permitted by law.
      </p>

      <h2>9. Changes</h2>
      <p>We may update these terms from time to time. Continued use after changes constitutes acceptance.</p>

      <h2>10. Governing Law</h2>
      <p>These terms are governed by the laws of India, with jurisdiction in the courts of Telangana.</p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a> or see our{" "}
        <a href="/contact">Contact</a> page.
      </p>
    </LegalShell>
  );
}
