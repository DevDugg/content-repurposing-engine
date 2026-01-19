import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { platformEnum, type Platform } from "@/lib/validations/platform";

interface RouteParams {
  params: Promise<{ id: string; platform: string }>;
}

const testConfigSchema = z.object({
  testTitle: z.string().min(1, "Title is required").max(500),
  testBody: z.string().min(1, "Body is required").max(50000),
  testImageUrl: z.string().url().optional(),
});

// POST /api/profiles/:id/platforms/:platform/test - Test platform configuration
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: profileId, platform } = await params;

    // Validate platform
    const platformResult = platformEnum.safeParse(platform);
    if (!platformResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLATFORM",
            message: "Invalid platform. Must be one of: instagram, linkedin, twitter, facebook, pinterest, tiktok",
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = testConfigSchema.parse(body);

    // Load platform configuration
    const config = await prisma.platformConfig.findUnique({
      where: {
        brandVoiceProfileId_platform: {
          brandVoiceProfileId: profileId,
          platform: platformResult.data as Platform,
        },
      },
      include: {
        brandVoiceProfile: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFIG_NOT_FOUND", message: "Platform configuration not found" },
        },
        { status: 404 }
      );
    }

    // Build the test prompt
    const systemPrompt = config.systemPrompt || buildDefaultSystemPrompt(config);
    const userPrompt = buildUserPrompt(config, validatedData.testTitle, validatedData.testBody);

    // For now, return a mock test output
    // In production, this would call n8n test webhook or Claude API directly
    const startTime = Date.now();

    // Simulate AI processing - in production this would be a real API call
    const testOutput = {
      optimizedImageUrl: validatedData.testImageUrl
        ? `https://res.cloudinary.com/demo/image/fetch/w_${config.imageWidth},h_${config.imageHeight},c_fill/${encodeURIComponent(validatedData.testImageUrl)}`
        : null,
      rewrittenCopy: generateMockCopy(config, validatedData.testTitle, validatedData.testBody),
      hashtags: generateMockHashtags(config),
      tokensUsed: Math.floor(Math.random() * 500) + 300,
      processingTimeMs: Date.now() - startTime + Math.floor(Math.random() * 2000),
    };

    return NextResponse.json({
      success: true,
      data: {
        platform: platformResult.data,
        testOutput,
        configUsed: {
          systemPrompt: systemPrompt.substring(0, 200) + "...",
          charLimit: config.charLimit,
          hashtagRange: `${config.hashtagCountMin}-${config.hashtagCountMax}`,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        note: "This is a test preview. Results may vary in production.",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error("Error testing platform config:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

function buildDefaultSystemPrompt(config: {
  platform: string;
  toneOverride: string | null;
  customInstructions: string | null;
  charLimit: number;
  hashtagCountMin: number;
  hashtagCountMax: number;
}): string {
  return `You are a social media copywriter specializing in ${config.platform} content.
${config.toneOverride ? `Tone: ${config.toneOverride}` : ""}
${config.customInstructions ? `Instructions: ${config.customInstructions}` : ""}
Character limit: ${config.charLimit}
Generate ${config.hashtagCountMin}-${config.hashtagCountMax} relevant hashtags.`;
}

function buildUserPrompt(
  config: { userPromptTemplate: string | null },
  title: string,
  body: string
): string {
  if (config.userPromptTemplate) {
    return config.userPromptTemplate
      .replace("{{title}}", title)
      .replace("{{body}}", body);
  }
  return `Transform this content for social media:\n\nTitle: ${title}\n\nBody: ${body}`;
}

function generateMockCopy(
  config: { platform: string; charLimit: number },
  title: string,
  body: string
): string {
  const hooks: Record<string, string> = {
    instagram: "Ready to level up? ",
    linkedin: "Here's what I learned: ",
    twitter: "",
    facebook: "Check this out! ",
    pinterest: "",
    tiktok: "POV: ",
  };

  const hook = hooks[config.platform] || "";
  const summary = body.substring(0, Math.min(body.length, config.charLimit - hook.length - 50));

  return `${hook}${title}\n\n${summary}...`;
}

function generateMockHashtags(config: {
  platform: string;
  hashtagCountMin: number;
  hashtagCountMax: number;
}): string[] {
  const platformHashtags: Record<string, string[]> = {
    instagram: ["#contentcreator", "#socialmedia", "#marketing", "#growth", "#business", "#entrepreneur", "#strategy", "#digitalmarketing", "#branding", "#success", "#instagood", "#instadaily", "#trending", "#viral", "#explore"],
    linkedin: ["#leadership", "#business", "#innovation", "#career", "#networking", "#professionaldevelopment"],
    twitter: ["#marketing", "#tech", "#trending"],
    facebook: ["#community", "#share", "#content"],
    pinterest: ["#inspiration", "#ideas", "#diy", "#creative", "#style", "#tips", "#howto", "#design", "#lifestyle", "#trending"],
    tiktok: ["#fyp", "#viral", "#trending", "#foryou", "#tiktok"],
  };

  const available = platformHashtags[config.platform] || ["#content", "#marketing"];
  const count = Math.floor(Math.random() * (config.hashtagCountMax - config.hashtagCountMin + 1)) + config.hashtagCountMin;

  return available.slice(0, Math.min(count, available.length));
}
