import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validations/content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/content/:id/schedule - Schedule content for publication
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
    const validatedData = scheduleSchema.parse(body);

    // Fetch content with outputs and platform configs
    const content = await prisma.contentQueue.findUnique({
      where: { id: contentId },
      include: {
        platformOutputs: true,
        brandVoiceProfile: {
          include: {
            platformConfigs: true,
          },
        },
      },
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

    if (content.status !== "complete" && content.status !== "partial") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_NOT_READY",
            message: "Content must be complete or partial to schedule",
          },
        },
        { status: 400 }
      );
    }

    const scheduledPlatforms: { platform: string; scheduled_for: string }[] = [];
    const now = new Date();

    for (const output of content.platformOutputs) {
      if (!output.rewrittenCopy) continue; // Skip failed platforms

      let scheduledTime: Date;

      if (validatedData.schedulingMode === "custom") {
        const customTime = validatedData.customSchedules?.[output.platform];
        if (!customTime) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "MISSING_SCHEDULE",
                message: `Custom schedule time required for ${output.platform}`,
              },
            },
            { status: 400 }
          );
        }
        scheduledTime = new Date(customTime);
      } else {
        // Use best posting time from config
        const config = content.brandVoiceProfile?.platformConfigs.find(
          (c) => c.platform === output.platform
        );
        const bestTime = config?.bestPostingTime || "14:00:00";
        const [hours, minutes, seconds] = bestTime.split(":").map(Number);

        scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, seconds, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
      }

      // Validate time is in future
      if (scheduledTime <= now) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_SCHEDULE",
              message: `Scheduled time for ${output.platform} must be in the future`,
            },
          },
          { status: 400 }
        );
      }

      // Update output with scheduled time
      await prisma.platformOutput.update({
        where: { id: output.id },
        data: { scheduledFor: scheduledTime },
      });

      scheduledPlatforms.push({
        platform: output.platform,
        scheduled_for: scheduledTime.toISOString(),
      });
    }

    // Trigger scheduler workflow
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(`${n8nWebhookUrl}/webhook/scheduler`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_id: contentId,
            schedules: scheduledPlatforms.map((sp) => ({
              output_id: content.platformOutputs.find(
                (o) => o.platform === sp.platform
              )?.id,
              platform: sp.platform,
              scheduled_for: sp.scheduled_for,
            })),
          }),
        });
      } catch (error) {
        console.error("Failed to trigger scheduler:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        content_id: contentId,
        scheduled_platforms: scheduledPlatforms,
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

    console.error("Error scheduling content:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
