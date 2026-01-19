import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/content - List recent content
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [content, total] = await Promise.all([
      prisma.contentQueue.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: { name: true },
          },
          brandVoiceProfile: {
            select: { profileName: true },
          },
          _count: {
            select: { platformOutputs: true },
          },
        },
      }),
      prisma.contentQueue.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        content: content.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          targetPlatforms: item.targetPlatforms,
          brandName: item.brand.name,
          profileName: item.brandVoiceProfile?.profileName || null,
          outputCount: item._count.platformOutputs,
          createdAt: item.createdAt.toISOString(),
          processingStartedAt: item.processingStartedAt?.toISOString() || null,
          processingCompletedAt: item.processingCompletedAt?.toISOString() || null,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
