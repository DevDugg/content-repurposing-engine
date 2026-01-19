import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { platformEnum, type Platform } from "@/lib/validations/platform";

const callbackSchema = z.object({
  content_id: z.string().uuid(),
  platform: platformEnum,
  status: z.enum(["success", "failed"]),
  output: z
    .object({
      optimized_image_url: z.string().url().optional(),
      rewritten_copy: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      tokens_used: z.number().optional(),
      processing_time_ms: z.number().optional(),
      model_used: z.string().optional(),
    })
    .optional(),
  error_message: z.string().optional(),
});

// POST /api/n8n/callback - Receive processing results from n8n
export async function POST(request: Request) {
  try {
    // Verify callback secret
    const secret = request.headers.get("x-n8n-secret");
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid callback secret" },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = callbackSchema.parse(body);

    // Find or create platform output
    const existingOutput = await prisma.platformOutput.findUnique({
      where: {
        contentId_platform: {
          contentId: validatedData.content_id,
          platform: validatedData.platform as Platform,
        },
      },
    });

    if (validatedData.status === "success" && validatedData.output) {
      if (existingOutput) {
        // Update existing output
        await prisma.platformOutput.update({
          where: { id: existingOutput.id },
          data: {
            optimizedImageUrl: validatedData.output.optimized_image_url,
            rewrittenCopy: validatedData.output.rewritten_copy,
            hashtags: validatedData.output.hashtags || [],
            tokensUsed: validatedData.output.tokens_used,
            processingTimeMs: validatedData.output.processing_time_ms,
            modelUsed: validatedData.output.model_used,
          },
        });
      } else {
        // Create new output
        await prisma.platformOutput.create({
          data: {
            contentId: validatedData.content_id,
            platform: validatedData.platform as Platform,
            optimizedImageUrl: validatedData.output.optimized_image_url,
            rewrittenCopy: validatedData.output.rewritten_copy,
            hashtags: validatedData.output.hashtags || [],
            tokensUsed: validatedData.output.tokens_used,
            processingTimeMs: validatedData.output.processing_time_ms,
            modelUsed: validatedData.output.model_used,
          },
        });
      }
    } else if (validatedData.status === "failed") {
      // Create/update output to mark as failed (null rewrittenCopy indicates failure)
      if (existingOutput) {
        await prisma.platformOutput.update({
          where: { id: existingOutput.id },
          data: {
            rewrittenCopy: null,
          },
        });
      } else {
        await prisma.platformOutput.create({
          data: {
            contentId: validatedData.content_id,
            platform: validatedData.platform as Platform,
            rewrittenCopy: null,
            hashtags: [],
          },
        });
      }
    }

    // Check if all platforms are complete
    const content = await prisma.contentQueue.findUnique({
      where: { id: validatedData.content_id },
      include: {
        platformOutputs: true,
      },
    });

    if (content) {
      const targetCount = content.targetPlatforms.length;
      const outputCount = content.platformOutputs.length;
      const successCount = content.platformOutputs.filter(
        (o) => o.rewrittenCopy !== null
      ).length;

      let newStatus: "complete" | "partial" | "failed" | "processing" = "processing";

      if (outputCount >= targetCount) {
        if (successCount === targetCount) {
          newStatus = "complete";
        } else if (successCount === 0) {
          newStatus = "failed";
        } else {
          newStatus = "partial";
        }

        await prisma.contentQueue.update({
          where: { id: validatedData.content_id },
          data: {
            status: newStatus,
            processingCompletedAt: new Date(),
            errorMessage:
              newStatus === "failed"
                ? validatedData.error_message || "All platforms failed"
                : null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { acknowledged: true },
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
            message: "Invalid callback data",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error("Error processing callback:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
