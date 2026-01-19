import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createProfileSchema } from "@/lib/validations/brand";
import { platformDefaults, platformEnum } from "@/lib/validations/platform";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/brands/:id/profiles - List voice profiles for a brand
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: brandId } = await params;

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
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

    const profiles = await prisma.brandVoiceProfile.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { platformConfigs: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profiles: profiles.map((profile) => ({
          id: profile.id,
          profileName: profile.profileName,
          globalTone: profile.globalTone,
          targetAudience: profile.targetAudience,
          createdAt: profile.createdAt,
          platformCount: profile._count.platformConfigs,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

// POST /api/brands/:id/profiles - Create new voice profile
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: brandId } = await params;
    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
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

    // Check if profile name already exists for this brand
    const existingProfile = await prisma.brandVoiceProfile.findUnique({
      where: {
        brandId_profileName: {
          brandId,
          profileName: validatedData.profileName,
        },
      },
    });

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROFILE_EXISTS",
            message: "A profile with this name already exists for this brand",
          },
        },
        { status: 400 }
      );
    }

    // Create profile with default platform configs
    const profile = await prisma.brandVoiceProfile.create({
      data: {
        brandId,
        profileName: validatedData.profileName,
        globalTone: validatedData.globalTone,
        globalDos: validatedData.globalDos,
        globalDonts: validatedData.globalDonts,
        targetAudience: validatedData.targetAudience,
        brandKeywords: validatedData.brandKeywords,
        exampleInput1: validatedData.exampleInput1,
        exampleOutput1: validatedData.exampleOutput1,
        exampleInput2: validatedData.exampleInput2,
        exampleOutput2: validatedData.exampleOutput2,
        exampleInput3: validatedData.exampleInput3,
        exampleOutput3: validatedData.exampleOutput3,
        // Create default platform configs for all 6 platforms
        platformConfigs: {
          create: platformEnum.options.map((platform) => ({
            platform,
            ...platformDefaults[platform],
            enabled: true,
          })),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          profile_id: profile.id,
          profile_name: profile.profileName,
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

    console.error("Error creating profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
