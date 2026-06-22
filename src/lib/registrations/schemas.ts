import { z } from "zod";

const PHONE = /^(?:\+91|91|0)?[6-9]\d{9}$/;

export const registerAttendeeSchema = z.object({
  event_id:       z.string().uuid(),
  tier_id:        z.string().uuid(),
  attendee_name:  z.string().trim().min(2, "Name is too short").max(120),
  attendee_email: z.string().trim().toLowerCase().email("Enter a valid email"),
  attendee_phone: z.string().trim().regex(PHONE, "Enter a valid Indian phone number"),
});

export type RegisterAttendeeInput = z.infer<typeof registerAttendeeSchema>;

// ── Hackathon team registration ──
export const teamMemberSchema = z.object({
  name:  z.string().trim().min(2, "Member name too short").max(120),
  email: z.string().trim().toLowerCase().email("Invalid member email"),
});

export const registerTeamSchema = z.object({
  event_id:   z.string().uuid(),
  team_name:  z.string().trim().min(2, "Team name too short").max(120),
  college:    z.string().trim().max(120).optional().or(z.literal("")),
  lead_phone: z.string().trim().regex(PHONE, "Enter a valid Indian phone number"),
  members:    z.array(teamMemberSchema).min(1).max(20),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
