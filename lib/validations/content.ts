import { z } from "zod";

import { platformEnum } from "./platform";

export const createContentSchema = z.object({
  brandId: z.string().uuid("Invalid brand ID"),
  brandVoiceProfileId: z.string().uuid("Invalid profile ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title must be 500 characters or less"),
  body: z
    .string()
    .min(1, "Body is required")
    .max(50000, "Body must be 50,000 characters or less"),
  imageUrls: z
    .array(z.string().url("Invalid image URL"))
    .optional()
    .default([]),
  targetPlatforms: z
    .array(platformEnum)
    .min(1, "At least one target platform is required"),
});

export const updateOutputSchema = z.object({
  editedCopy: z.string().max(100000).optional(),
  editedHashtags: z.array(z.string().regex(/^#/, "Hashtag must start with #")).optional(),
});

export const regenerateSchema = z.object({
  platforms: z.array(platformEnum).min(1, "At least one platform is required"),
});

export const scheduleSchema = z.object({
  schedulingMode: z.enum(["best_times", "custom"]),
  customSchedules: z
    .record(platformEnum, z.string().datetime())
    .optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateOutputInput = z.infer<typeof updateOutputSchema>;
export type RegenerateInput = z.infer<typeof regenerateSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
