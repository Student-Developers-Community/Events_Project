import { z } from "zod";
import type { EventQuestion } from "@/lib/db/types";

export const eventCategoryEnum = z.enum([
  "hackathon", "workshop", "conference", "meetup", "demo_day", "other",
]);

const PHONE = /^(?:\+91|91|0)?[6-9]\d{9}$/;

export const eventCreateSchema = z.object({
  title:        z.string().trim().min(3, "Title is too short").max(120),
  subtitle:     z.string().trim().max(200).optional().or(z.literal("")),
  description:  z.string().trim().max(8000).optional().or(z.literal("")),
  category:     eventCategoryEnum,
  starts_at:    z.string().min(1, "Start time required"),
  ends_at:      z.string().min(1, "End time required"),
  is_online:    z.coerce.boolean().default(false),
  venue_name:   z.string().trim().max(200).optional().or(z.literal("")),
  city:         z.string().trim().max(80).optional().or(z.literal("")),
  online_url:   z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  total_capacity: z.coerce.number().int().positive().max(100000).optional().or(z.literal("")),
  cover_image_url: z.string().trim().url("Invalid image URL").optional().or(z.literal("")),
  contact_email:  z.string().trim().toLowerCase().email("Enter a valid contact email").optional().or(z.literal("")),
  contact_phone:  z.string().trim().regex(PHONE, "Enter a valid Indian phone number").optional().or(z.literal("")),
}).refine(
  (v) => new Date(v.ends_at) > new Date(v.starts_at),
  { message: "End time must be after start time", path: ["ends_at"] }
).refine(
  (v) => v.is_online ? !!v.online_url : (!!v.venue_name || !!v.city),
  { message: "Provide venue/city for in-person events, or an online URL", path: ["venue_name"] }
);

export const questionTypeEnum = z.enum(["text", "textarea", "url", "email", "phone"]);

/** A single custom registration question. */
export const eventQuestionSchema = z.object({
  id:       z.string().trim().min(1).max(40),
  label:    z.string().trim().min(1, "Question label required").max(120),
  type:     questionTypeEnum,
  required: z.coerce.boolean().default(false),
});

/** The full ordered list. Capped so the form stays sane. */
export const eventQuestionsSchema = z.array(eventQuestionSchema).max(15, "Up to 15 questions allowed");

/** Parse the JSON string the form submits in the hidden `questions` field. */
export function parseQuestionsField(raw: FormDataEntryValue | null): EventQuestion[] {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = eventQuestionsSchema.safeParse(json);
  return result.success ? (result.data as EventQuestion[]) : [];
}

export const tierCreateSchema = z.object({
  event_id:     z.string().uuid(),
  name:         z.string().trim().min(1, "Tier name required").max(80),
  description:  z.string().trim().max(500).optional().or(z.literal("")),
  price_rupees: z.coerce.number().min(0, "Price can't be negative").max(1000000),
  capacity:     z.coerce.number().int().positive().max(100000).optional().or(z.literal("")),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type TierCreateInput  = z.infer<typeof tierCreateSchema>;
