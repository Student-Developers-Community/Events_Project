import { z } from "zod";

const PHONE = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const optionalUrl = z.string().trim().url("Must be a valid URL").optional().or(z.literal(""));

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Name is too short").max(80),
  phone:        z.string().trim().regex(PHONE, "Enter a valid Indian phone number").optional().or(z.literal("")),
  bio:          z.string().trim().max(500).optional().or(z.literal("")),
  avatar_url:   optionalUrl,
  website_url:  optionalUrl,
});

export const passwordSchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export type ProfileInput  = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
