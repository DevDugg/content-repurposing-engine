"use client";

import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { PlatformPreviewCard } from "@/components/content/platform-preview-card";
import { StatusBadge } from "@/components/content/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentStatus {
  content_id: string;
  status: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  platforms_complete: string[];
  platforms_pending: string[];
  platforms_failed: string[];
  error_message: string | null;
}

interface PlatformOutput {
  id: string;
  platform: string;
  optimizedImageUrl: string | null;
  rewrittenCopy: string | null;
  hashtags: string[];
  userEdited: boolean;
  editedCopy: string | null;
  editedHashtags: string[];
  scheduledFor: string | null;
  published: boolean;
}

interface ContentOutputs {
  content_id: string;
  title: string;
  status: string;
  outputs: PlatformOutput[];
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [status, setStatus] = useState<ContentStatus | null>(null);
  const [outputs, setOutputs] = useState<ContentOutputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/content/${contentId}/status`);
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
        return data.data.status;
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
    return null;
  }, [contentId]);

  const fetchOutputs = useCallback(async () => {
    try {
      const response = await fetch(`/api/content/${contentId}/outputs`);
      const data = await response.json();
      if (data.success) {
        setOutputs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch outputs:", error);
    }
  }, [contentId]);

  // Initial fetch
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const currentStatus = await fetchStatus();
      if (currentStatus === "complete" || currentStatus === "partial" || currentStatus === "failed") {
        await fetchOutputs();
      }
      setLoading(false);
    }
    loadData();
  }, [fetchStatus, fetchOutputs]);

  // Poll for updates when processing
  useEffect(() => {
    if (!status || status.status === "complete" || status.status === "failed") {
      setPolling(false);
      return;
    }

    if (status.status === "pending" || status.status === "processing") {
      setPolling(true);
      const interval = setInterval(async () => {
        const newStatus = await fetchStatus();
        if (newStatus === "complete" || newStatus === "partial" || newStatus === "failed") {
          await fetchOutputs();
          clearInterval(interval);
          setPolling(false);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [status?.status, fetchStatus, fetchOutputs]);

  const handleRegenerate = async (platforms: string[]) => {
    try {
      const response = await fetch(`/api/content/${contentId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Regeneration started");
        setStatus((prev) => prev ? { ...prev, status: "processing" } : null);
      } else {
        toast.error(data.error?.message || "Failed to regenerate");
      }
    } catch (error) {
      toast.error("Failed to regenerate");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Content Details" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = status?.status === "pending" || status?.status === "processing";

  return (
    <div className="flex flex-col">
      <Header
        title={outputs?.title || "Content Details"}
        description={`Content ID: ${contentId.slice(0, 8)}...`}
      />
      <div className="p-6 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Status
              {polling && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            {status && <StatusBadge status={status.status} />}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  Complete: {status?.platforms_complete?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  Pending: {status?.platforms_pending?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  Failed: {status?.platforms_failed?.length || 0}
                </span>
              </div>
            </div>
            {status?.error_message && (
              <p className="mt-4 text-sm text-red-500">{status.error_message}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {!isProcessing && outputs && (
          <div className="flex gap-4">
            <Button asChild>
              <Link href={`/dashboard/content/${contentId}/schedule`}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule All
              </Link>
            </Button>
            {status?.platforms_failed && status.platforms_failed.length > 0 && (
              <Button
                variant="outline"
                onClick={() => handleRegenerate(status.platforms_failed)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Failed
              </Button>
            )}
          </div>
        )}

        {/* Platform Outputs */}
        {isProcessing ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processing your content...</p>
              <p className="text-sm text-muted-foreground">
                This typically takes 30-60 seconds per platform
              </p>
            </CardContent>
          </Card>
        ) : outputs ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {outputs.outputs.map((output) => (
              <PlatformPreviewCard
                key={output.id}
                output={output}
                contentId={contentId}
                onUpdate={fetchOutputs}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">No outputs available</p>
              <p className="text-sm text-muted-foreground">
                Processing may have failed or content was not found
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
