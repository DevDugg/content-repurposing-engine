import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createContentSchema } from "@/lib/validations/content";

// POST /api/content/create - Submit new content for processing
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createContentSchema.parse(body);

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: validatedData.brandId },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BRAND", message: "Brand not found" },
        },
        { status: 404 }
      );
    }

    // Verify profile exists and belongs to brand
    const profile = await prisma.brandVoiceProfile.findFirst({
      where: {
        id: validatedData.brandVoiceProfileId,
        brandId: validatedData.brandId,
      },
      include: {
        platformConfigs: {
          where: {
            enabled: true,
            platform: { in: validatedData.targetPlatforms },
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PROFILE",
            message: "Profile not found or doesn't belong to the specified brand",
          },
        },
        { status: 404 }
      );
    }

    // Check that all target platforms have enabled configs
    const enabledPlatforms = profile.platformConfigs.map((c) => c.platform);
    const missingPlatforms = validatedData.targetPlatforms.filter(
      (p) => !enabledPlatforms.includes(p)
    );

    if (missingPlatforms.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_PLATFORM_CONFIG",
            message: `The following platforms are not enabled: ${missingPlatforms.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Create content queue entry
    const content = await prisma.contentQueue.create({
      data: {
        brandId: validatedData.brandId,
        brandVoiceProfileId: validatedData.brandVoiceProfileId,
        title: validatedData.title,
        body: validatedData.body,
        imageUrls: validatedData.imageUrls,
        targetPlatforms: validatedData.targetPlatforms,
        status: "pending",
      },
    });

    // Trigger n8n master orchestrator webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(`${n8nWebhookUrl}/webhook/orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_id: content.id,
            brand_id: content.brandId,
            brand_voice_profile_id: content.brandVoiceProfileId,
          }),
        });
      } catch (error) {
        console.error("Failed to trigger n8n webhook:", error);
        // Update content status to failed
        await prisma.contentQueue.update({
          where: { id: content.id },
          data: {
            status: "failed",
            errorMessage: "Failed to trigger processing workflow",
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "N8N_TRIGGER_FAILED",
              message: "Unable to start processing. Please try again.",
            },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          content_id: content.id,
          status: "pending",
          estimated_completion_seconds: 60,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
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

    console.error("Error creating content:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
