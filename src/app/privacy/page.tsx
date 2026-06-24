import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "Privacy Policy · TechEvent" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how <strong>{ENTITY.legalName}</strong> (“we”), operator of {ENTITY.brand},
        collects, uses, and protects your personal information when you use the Platform.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account &amp; registration data:</strong> name, email, phone number, and any details you submit when registering for an event (including organiser-defined questions and, for hackathons, team and college details).</li>
        <li><strong>Transaction data:</strong> records of registrations and payments. Card/UPI details are handled by our payment provider and are never stored by us.</li>
        <li><strong>Technical data:</strong> basic device/usage information needed to operate and secure the service.</li>
      </ul>

      <h2>2. How We Use It</h2>
      <ul>
        <li>To create and manage your registrations and issue QR tickets.</li>
        <li>To send transactional emails (confirmations, reminders, event announcements).</li>
        <li>To share necessary attendee details with the organiser of the event you register for.</li>
        <li>To process payments and prevent fraud.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        We share data with: the <strong>event organiser</strong> you register with (your registration details);
        our <strong>payment aggregator</strong> (Razorpay) to process payments; and our infrastructure/email
        providers strictly to operate the service. We do not sell your personal data.
      </p>

      <h2>4. Data Storage &amp; Security</h2>
      <p>
        Data is stored on secured cloud infrastructure with access controls and row-level security. We retain
        registration records as long as needed to provide the service and meet legal obligations.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data by emailing{" "}
        <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>. Note that some records must be retained for
        accounting/compliance.
      </p>

      <h2>6. Cookies</h2>
      <p>We use essential cookies for authentication and session management only.</p>

      <h2>7. Changes</h2>
      <p>We may update this policy; the “last updated” date above reflects the latest version.</p>

      <h2>8. Contact</h2>
      <p>
        For privacy questions, contact <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
      </p>
    </LegalShell>
  );
}
