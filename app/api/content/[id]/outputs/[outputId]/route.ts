import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateOutputSchema } from "@/lib/validations/content";

interface RouteParams {
  params: Promise<{ id: string; outputId: string }>;
}

// PATCH /api/content/:id/outputs/:outputId - Update output with user edits
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: contentId, outputId } = await params;
    const body = await request.json();
    const validatedData = updateOutputSchema.parse(body);

    // Verify output exists and belongs to the content
    const output = await prisma.platformOutput.findFirst({
      where: {
        id: outputId,
        contentId: contentId,
      },
      include: {
        content: {
          include: {
            brandVoiceProfile: {
              include: {
                platformConfigs: {
                  where: { platform: undefined }, // Will be filtered in code
                },
              },
            },
          },
        },
      },
    });

    if (!output) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "OUTPUT_NOT_FOUND", message: "Output not found" },
        },
        { status: 404 }
      );
    }

    // Validate edited copy length against platform char limit
    if (validatedData.editedCopy) {
      const platformConfig = output.content.brandVoiceProfile?.platformConfigs.find(
        (c) => c.platform === output.platform
      );
      const charLimit = platformConfig?.charLimit || 10000;

      if (validatedData.editedCopy.length > charLimit) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CHAR_LIMIT_EXCEEDED",
              message: `Copy exceeds platform character limit of ${charLimit}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Update output
    const updatedOutput = await prisma.platformOutput.update({
      where: { id: outputId },
      data: {
        userEdited: true,
        editedCopy: validatedData.editedCopy ?? output.editedCopy,
        editedHashtags: validatedData.editedHashtags ?? output.editedHashtags,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        output_id: updatedOutput.id,
        user_edited: updatedOutput.userEdited,
        edited_copy: updatedOutput.editedCopy,
        edited_hashtags: updatedOutput.editedHashtags,
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

    console.error("Error updating output:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
