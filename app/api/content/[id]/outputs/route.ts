import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/content/:id/outputs - Get all generated platform outputs
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
    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get("include_metadata") === "true";

    const content = await prisma.contentQueue.findUnique({
      where: { id: contentId },
      include: {
        platformOutputs: {
          orderBy: { platform: "asc" },
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

    return NextResponse.json({
      success: true,
      data: {
        content: {
          id: content.id,
          title: content.title,
          body: content.body,
          status: content.status,
        },
        outputs: content.platformOutputs.map((output) => ({
          id: output.id,
          platform: output.platform,
          optimizedImageUrl: output.optimizedImageUrl,
          rewrittenCopy: output.rewrittenCopy,
          hashtags: output.hashtags,
          userEdited: output.userEdited,
          editedCopy: output.editedCopy,
          editedHashtags: output.editedHashtags,
          scheduledFor: output.scheduledFor,
          published: output.published,
          ...(includeMetadata && {
            metadata: {
              modelUsed: output.modelUsed,
              tokensUsed: output.tokensUsed,
              processingTimeMs: output.processingTimeMs,
              promptVersion: output.promptVersion,
            },
          }),
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching outputs:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
