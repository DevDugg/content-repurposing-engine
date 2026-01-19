import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/profiles/:id/platforms - Get all platform configurations for a voice profile
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: profileId } = await params;

    // Fetch profile with platform configs
    const profile = await prisma.brandVoiceProfile.findUnique({
      where: { id: profileId },
      include: {
        platformConfigs: {
          orderBy: { platform: "asc" },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PROFILE", message: "Profile not found" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          profileName: profile.profileName,
          globalTone: profile.globalTone,
          globalDos: profile.globalDos,
          globalDonts: profile.globalDonts,
          targetAudience: profile.targetAudience,
          brandKeywords: profile.brandKeywords,
        },
        platforms: profile.platformConfigs.map((config) => ({
          id: config.id,
          platform: config.platform,
          toneOverride: config.toneOverride,
          customInstructions: config.customInstructions,
          imageWidth: config.imageWidth,
          imageHeight: config.imageHeight,
          charLimit: config.charLimit,
          hashtagCountMin: config.hashtagCountMin,
          hashtagCountMax: config.hashtagCountMax,
          bestPostingTime: config.bestPostingTime,
          postingFrequency: config.postingFrequency,
          enabled: config.enabled,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching platform configs:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
