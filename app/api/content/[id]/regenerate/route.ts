import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { regenerateSchema } from "@/lib/validations/content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/content/:id/regenerate - Regenerate specific platform outputs
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: contentId } = await params;
    const body = await request.json();
    const validatedData = regenerateSchema.parse(body);

    // Fetch content
    const content = await prisma.contentQueue.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONTENT_NOT_FOUND", message: "Content not found" },
        },
        { status: 404 }
      );
    }

    // Verify requested platforms are in target platforms
    const invalidPlatforms = validatedData.platforms.filter(
      (p) => !content.targetPlatforms.includes(p)
    );

    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLATFORMS",
            message: `Platforms not in original target: ${invalidPlatforms.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Delete existing outputs for specified platforms
    await prisma.platformOutput.deleteMany({
      where: {
        contentId,
        platform: { in: validatedData.platforms },
      },
    });

    // Update content status
    await prisma.contentQueue.update({
      where: { id: contentId },
      data: { status: "processing" },
    });

    // Trigger n8n for regeneration
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      for (const platform of validatedData.platforms) {
        try {
          await fetch(`${n8nWebhookUrl}/webhook/processor-${platform}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content_id: content.id,
              brand_id: content.brandId,
              brand_voice_profile_id: content.brandVoiceProfileId,
              platform,
            }),
          });
        } catch (error) {
          console.error(`Failed to trigger n8n for ${platform}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        content_id: contentId,
        regenerating_platforms: validatedData.platforms,
        status: "processing",
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

    console.error("Error regenerating content:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
