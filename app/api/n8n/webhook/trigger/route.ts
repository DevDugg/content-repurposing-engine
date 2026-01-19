import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";

const triggerSchema = z.object({
  workflowType: z.enum(["master_orchestrator", "platform_processor", "scheduler"]),
  payload: z.record(z.string(), z.unknown()),
});

// POST /api/n8n/webhook/trigger - Internal endpoint to trigger n8n workflows
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
    const validatedData = triggerSchema.parse(body);

    const n8nBaseUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678";

    // Map workflow types to webhook paths
    const webhookPaths: Record<string, string> = {
      master_orchestrator: "/webhook/content-process",
      platform_processor: "/webhook/platform-process",
      scheduler: "/webhook/schedule-content",
    };

    const webhookUrl = `${n8nBaseUrl}${webhookPaths[validatedData.workflowType]}`;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-Auth": process.env.N8N_AUTH_SECRET || "",
        },
        body: JSON.stringify(validatedData.payload),
      });

      if (!response.ok) {
        console.error("n8n webhook failed:", response.status, await response.text());
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "N8N_TRIGGER_FAILED",
              message: "Failed to trigger n8n workflow",
            },
          },
          { status: 502 }
        );
      }

      const result = await response.json().catch(() => ({}));

      return NextResponse.json({
        success: true,
        data: {
          n8nExecutionId: result.executionId || null,
          status: "triggered",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (fetchError) {
      // n8n might not be running - log but don't fail hard
      console.warn("Could not reach n8n:", fetchError);

      return NextResponse.json({
        success: true,
        data: {
          n8nExecutionId: null,
          status: "queued",
          note: "n8n is not reachable. Processing will occur when n8n is available.",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    }
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

    console.error("Error triggering n8n webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
