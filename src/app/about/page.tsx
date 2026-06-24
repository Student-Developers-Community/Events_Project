import LegalShell from "@/components/LegalShell";
import { ENTITY } from "@/lib/legal";

export const metadata = { title: "About Us · TechEvent" };

export default function AboutPage() {
  return (
    <LegalShell title="About Us">
      <p>
        {ENTITY.brand} is an <strong>{ENTITY.lob}</strong> operated by <strong>{ENTITY.legalName}</strong>. We help
        communities, colleges, and companies across India host tech events — hackathons, workshops, conferences,
        meetups, and demo days.
      </p>

      <h2>What We Offer</h2>
      <ul>
        <li>Public event pages with free or paid ticket tiers (priced in INR/₹).</li>
        <li>Online registration with instant QR tickets delivered by email.</li>
        <li>Team-based hackathon registration with college eligibility and quotas.</li>
        <li>QR-based check-in at the door, attendee management, and announcements.</li>
      </ul>

      <h2>Business Details</h2>
      <ul>
        <li><strong>Entity:</strong> {ENTITY.legalName}</li>
        <li><strong>Line of business:</strong> {ENTITY.lob}</li>
        <li><strong>Email:</strong> <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a></li>
        <li><strong>Address:</strong> {ENTITY.address}</li>
      </ul>

      <p>
        See our <a href="/terms">Terms</a>, <a href="/privacy">Privacy Policy</a>,{" "}
        <a href="/refund">Refund Policy</a>, and <a href="/contact">Contact</a> pages for more.
      </p>
    </LegalShell>
  );
}
