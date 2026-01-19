"use client";

import { ArrowLeft, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/content/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentOutput {
  id: string;
  platform: string;
  rewrittenCopy: string | null;
  hashtags: string[];
  optimizedImageUrl: string | null;
  scheduledFor: string | null;
}

interface ContentData {
  id: string;
  title: string;
  status: string;
  outputs: ContentOutput[];
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📱",
  linkedin: "💼",
  twitter: "🐦",
  facebook: "📘",
  pinterest: "📌",
  tiktok: "🎵",
};

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [schedulingMode, setSchedulingMode] = useState<"best_times" | "custom">("best_times");
  const [customSchedules, setCustomSchedules] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(`/api/content/${contentId}/outputs`);
        const data = await response.json();

        if (data.success) {
          setContent({
            id: data.data.content.id,
            title: data.data.content.title,
            status: data.data.content.status,
            outputs: data.data.outputs,
          });

          // Initialize custom schedules with default times (tomorrow at best time)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const schedules: Record<string, string> = {};

          data.data.outputs.forEach((output: ContentOutput) => {
            const defaultTime = getDefaultTime(output.platform);
            tomorrow.setHours(defaultTime.hour, defaultTime.minute, 0, 0);
            schedules[output.platform] = tomorrow.toISOString().slice(0, 16);
          });

          setCustomSchedules(schedules);
        } else {
          toast.error(data.error?.message || "Failed to load content");
        }
      } catch (error) {
        console.error("Failed to fetch content:", error);
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [contentId]);

  const getDefaultTime = (platform: string): { hour: number; minute: number } => {
    const times: Record<string, { hour: number; minute: number }> = {
      instagram: { hour: 14, minute: 0 },
      linkedin: { hour: 9, minute: 0 },
      twitter: { hour: 11, minute: 0 },
      facebook: { hour: 13, minute: 0 },
      pinterest: { hour: 20, minute: 0 },
      tiktok: { hour: 19, minute: 0 },
    };
    return times[platform] || { hour: 12, minute: 0 };
  };

  const handleSchedule = async () => {
    if (!content) return;

    setScheduling(true);
    try {
      const response = await fetch(`/api/content/${contentId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedulingMode,
          customSchedules: schedulingMode === "custom" ? customSchedules : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Content scheduled successfully!");
        router.push(`/dashboard/content/${contentId}`);
      } else {
        toast.error(data.error?.message || "Failed to schedule content");
      }
    } catch (error) {
      console.error("Failed to schedule:", error);
      toast.error("Failed to schedule content");
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Schedule Content" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col">
        <Header title="Schedule Content" />
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Content not found</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (content.status !== "complete") {
    return (
      <div className="flex flex-col">
        <Header title="Schedule Content" />
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Content must be complete before scheduling.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Current status: <StatusBadge status={content.status} />
              </p>
              <Button asChild className="mt-4">
                <Link href={`/dashboard/content/${contentId}`}>View Content</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Schedule Content" />
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="w-fit">
          <Link href={`/dashboard/content/${contentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
          </Link>
        </Button>

        {/* Title */}
        <div>
          <h2 className="text-xl font-semibold">{content.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule your content for publication
          </p>
        </div>

        {/* Scheduling Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduling Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={schedulingMode}
              onValueChange={(value) => setSchedulingMode(value as "best_times" | "custom")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="best_times" id="best_times" />
                <Label htmlFor="best_times" className="cursor-pointer">
                  <span className="font-medium">Use Best Times</span>
                  <span className="block text-sm text-muted-foreground">
                    Automatically schedule at optimal posting times for each platform
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">
                  <span className="font-medium">Custom Schedule</span>
                  <span className="block text-sm text-muted-foreground">
                    Choose specific dates and times for each platform
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Platform Schedules */}
        <div className="space-y-4">
          {content.outputs.map((output) => (
            <Card key={output.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{PLATFORM_ICONS[output.platform]}</span>
                  <span className="capitalize">{output.platform}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {output.rewrittenCopy || "No content generated"}
                </div>

                {/* Schedule Time */}
                <div className="flex items-center gap-4">
                  {schedulingMode === "best_times" ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Tomorrow at {getDefaultTime(output.platform).hour}:
                        {getDefaultTime(output.platform).minute.toString().padStart(2, "0")}
                      </span>
                      <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                      <span className="text-muted-foreground">Best time for {output.platform}</span>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Label htmlFor={`schedule-${output.platform}`} className="sr-only">
                        Schedule time for {output.platform}
                      </Label>
                      <Input
                        id={`schedule-${output.platform}`}
                        type="datetime-local"
                        value={customSchedules[output.platform] || ""}
                        onChange={(e) =>
                          setCustomSchedules((prev) => ({
                            ...prev,
                            [output.platform]: e.target.value,
                          }))
                        }
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-auto"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/content/${contentId}`}>Cancel</Link>
          </Button>
          <Button onClick={handleSchedule} disabled={scheduling}>
            {scheduling ? "Scheduling..." : "Schedule All"}
          </Button>
        </div>
      </div>
    </div>
  );
}
