import { z } from "zod";

export const createBrandSchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be 255 characters or less"),
});

export const createProfileSchema = z.object({
  profileName: z
    .string()
    .min(1, "Profile name is required")
    .max(100, "Profile name must be 100 characters or less"),
  globalTone: z.string().max(5000).optional().nullable(),
  globalDos: z.array(z.string().max(500)).optional().default([]),
  globalDonts: z.array(z.string().max(500)).optional().default([]),
  targetAudience: z.string().max(1000).optional().nullable(),
  brandKeywords: z.array(z.string()).optional().default([]),
  exampleInput1: z.string().max(5000).optional().nullable(),
  exampleOutput1: z.string().max(5000).optional().nullable(),
  exampleInput2: z.string().max(5000).optional().nullable(),
  exampleOutput2: z.string().max(5000).optional().nullable(),
  exampleInput3: z.string().max(5000).optional().nullable(),
  exampleOutput3: z.string().max(5000).optional().nullable(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
