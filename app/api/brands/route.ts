import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createBrandSchema } from "@/lib/validations/brand";

// GET /api/brands - List all brands
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { voiceProfiles: true, contentQueue: true },
          },
        },
      }),
      prisma.brand.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        brands: brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          createdAt: brand.createdAt,
          profileCount: brand._count.voiceProfiles,
          contentCount: brand._count.contentQueue,
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
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create new brand
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
    const validatedData = createBrandSchema.parse(body);

    // Check if brand name already exists
    const existingBrand = await prisma.brand.findUnique({
      where: { name: validatedData.name },
    });

    if (existingBrand) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BRAND_EXISTS",
            message: "A brand with this name already exists",
          },
        },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: { name: validatedData.name },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          brand_id: brand.id,
          name: brand.name,
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

    console.error("Error creating brand:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
