/**
 * Single source of truth for the legal entity shown on every policy page.
 * Razorpay rejects sites where the entity name differs across policies or
 * doesn't match the bank/GST/MID — so keep these values exact and consistent.
 *
 * ⚠️ CONFIRM these against your bank account / GST registration before going live:
 *   - legalName  (must match the account that receives settlements)
 *   - address, phone  (required on Contact + policies)
 */
export const ENTITY = {
  /** Registered legal name receiving payment settlements. */
  legalName: "Student Developers Community",
  /** Public brand / product name. */
  brand: "TechEvent",
  /** Line of Business declared to the payment aggregator. */
  lob: "Event Ticketing & Management Platform",

  email: "developer@sdcindia01.com",
  phone: "+91-XXXXXXXXXX", // TODO: real support number
  address: "Hyderabad, Telangana, India", // TODO: full registered address

  website: "https://events-website-ten.vercel.app",

  /** Refund commitments (must state a clear timeframe for Razorpay). */
  refundProcessingDays: "7–10 business days",
  refundCutoff: "48 hours before the event start time",

  supportHours: "Mon–Sat, 10:00 AM – 6:00 PM IST",
  lastUpdated: "June 2026",
} as const;
