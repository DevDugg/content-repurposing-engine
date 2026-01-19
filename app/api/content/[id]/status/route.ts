import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/content/:id/status - Check processing status
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: contentId } = await params;

    const content = await prisma.contentQueue.findUnique({
      where: { id: contentId },
      include: {
        platformOutputs: {
          select: {
            platform: true,
            rewrittenCopy: true,
            createdAt: true,
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

    // Calculate platform status
    const completedPlatforms = content.platformOutputs
      .filter((o) => o.rewrittenCopy !== null)
      .map((o) => o.platform);

    const failedPlatforms = content.platformOutputs
      .filter((o) => o.rewrittenCopy === null)
      .map((o) => o.platform);

    const pendingPlatforms = content.targetPlatforms.filter(
      (p) => !completedPlatforms.includes(p) && !failedPlatforms.includes(p)
    );

    return NextResponse.json({
      success: true,
      data: {
        content_id: content.id,
        status: content.status,
        processing_started_at: content.processingStartedAt,
        processing_completed_at: content.processingCompletedAt,
        platforms_complete: completedPlatforms,
        platforms_pending: pendingPlatforms,
        platforms_failed: failedPlatforms,
        error_message: content.errorMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching content status:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
