import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  platformEnum,
  updatePlatformConfigSchema,
  type Platform,
} from "@/lib/validations/platform";

interface RouteParams {
  params: Promise<{ id: string; platform: string }>;
}

// GET /api/profiles/:id/platforms/:platform - Get specific platform configuration
export async function GET(request: Request, { params }: RouteParams) {
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

    const config = await prisma.platformConfig.findUnique({
      where: {
        brandVoiceProfileId_platform: {
          brandVoiceProfileId: profileId,
          platform: platformResult.data as Platform,
        },
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

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        platform: config.platform,
        toneOverride: config.toneOverride,
        customInstructions: config.customInstructions,
        imageWidth: config.imageWidth,
        imageHeight: config.imageHeight,
        charLimit: config.charLimit,
        hashtagCountMin: config.hashtagCountMin,
        hashtagCountMax: config.hashtagCountMax,
        systemPrompt: config.systemPrompt,
        userPromptTemplate: config.userPromptTemplate,
        examples: [
          config.exampleInput1 && config.exampleOutput1
            ? { input: config.exampleInput1, output: config.exampleOutput1 }
            : null,
          config.exampleInput2 && config.exampleOutput2
            ? { input: config.exampleInput2, output: config.exampleOutput2 }
            : null,
        ].filter(Boolean),
        bestPostingTime: config.bestPostingTime,
        postingFrequency: config.postingFrequency,
        enabled: config.enabled,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching platform config:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

// PUT /api/profiles/:id/platforms/:platform - Update platform configuration
export async function PUT(request: Request, { params }: RouteParams) {
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
    const validatedData = updatePlatformConfigSchema.parse(body);

    // Validate hashtag range
    if (
      validatedData.hashtagCountMin !== undefined &&
      validatedData.hashtagCountMax !== undefined &&
      validatedData.hashtagCountMin > validatedData.hashtagCountMax
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Minimum hashtag count cannot be greater than maximum",
          },
        },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.platformConfig.findUnique({
      where: {
        brandVoiceProfileId_platform: {
          brandVoiceProfileId: profileId,
          platform: platformResult.data as Platform,
        },
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFIG_NOT_FOUND", message: "Platform configuration not found" },
        },
        { status: 404 }
      );
    }

    // Update config
    const updatedConfig = await prisma.platformConfig.update({
      where: { id: existingConfig.id },
      data: validatedData,
    });

    const updatedFields = Object.keys(validatedData);

    return NextResponse.json({
      success: true,
      data: {
        platform: updatedConfig.platform,
        updated_fields: updatedFields,
      },
      meta: {
        timestamp: new Date().toISOString(),
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

    console.error("Error updating platform config:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
