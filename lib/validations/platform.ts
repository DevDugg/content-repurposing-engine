import { z } from "zod";

export const platformEnum = z.enum([
  "instagram",
  "linkedin",
  "twitter",
  "facebook",
  "pinterest",
  "tiktok",
]);

export const updatePlatformConfigSchema = z.object({
  toneOverride: z.string().max(5000).optional().nullable(),
  customInstructions: z.string().max(10000).optional().nullable(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  charLimit: z.number().int().min(1).max(100000).optional(),
  hashtagCountMin: z.number().int().min(0).optional(),
  hashtagCountMax: z.number().int().min(0).optional(),
  systemPrompt: z.string().max(10000).optional().nullable(),
  userPromptTemplate: z.string().max(20000).optional().nullable(),
  exampleInput1: z.string().max(5000).optional().nullable(),
  exampleOutput1: z.string().max(5000).optional().nullable(),
  exampleInput2: z.string().max(5000).optional().nullable(),
  exampleOutput2: z.string().max(5000).optional().nullable(),
  bestPostingTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional()
    .nullable(),
  postingFrequency: z.string().max(50).optional().nullable(),
  enabled: z.boolean().optional(),
});

export const testPlatformConfigSchema = z.object({
  testTitle: z.string().min(1, "Test title is required").max(500),
  testBody: z.string().min(1, "Test body is required").max(50000),
  testImageUrl: z.string().url().optional().nullable(),
});

export type Platform = z.infer<typeof platformEnum>;
export type UpdatePlatformConfigInput = z.infer<
  typeof updatePlatformConfigSchema
>;
export type TestPlatformConfigInput = z.infer<typeof testPlatformConfigSchema>;

// Default platform configurations
export const platformDefaults: Record<
  Platform,
  {
    imageWidth: number;
    imageHeight: number;
    charLimit: number;
    hashtagCountMin: number;
    hashtagCountMax: number;
    bestPostingTime: string;
  }
> = {
  instagram: {
    imageWidth: 1080,
    imageHeight: 1080,
    charLimit: 2200,
    hashtagCountMin: 10,
    hashtagCountMax: 15,
    bestPostingTime: "14:00:00",
  },
  linkedin: {
    imageWidth: 1200,
    imageHeight: 627,
    charLimit: 3000,
    hashtagCountMin: 3,
    hashtagCountMax: 5,
    bestPostingTime: "09:00:00",
  },
  twitter: {
    imageWidth: 1600,
    imageHeight: 900,
    charLimit: 280,
    hashtagCountMin: 2,
    hashtagCountMax: 3,
    bestPostingTime: "11:00:00",
  },
  facebook: {
    imageWidth: 1200,
    imageHeight: 630,
    charLimit: 63206,
    hashtagCountMin: 2,
    hashtagCountMax: 3,
    bestPostingTime: "13:00:00",
  },
  pinterest: {
    imageWidth: 1000,
    imageHeight: 1500,
    charLimit: 500,
    hashtagCountMin: 5,
    hashtagCountMax: 10,
    bestPostingTime: "20:00:00",
  },
  tiktok: {
    imageWidth: 1080,
    imageHeight: 1920,
    charLimit: 2200,
    hashtagCountMin: 3,
    hashtagCountMax: 5,
    bestPostingTime: "19:00:00",
  },
};
