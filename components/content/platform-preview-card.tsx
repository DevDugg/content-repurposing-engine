"use client";

import { Copy, Edit, RefreshCw, Save, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

interface PlatformPreviewCardProps {
  output: PlatformOutput;
  contentId: string;
  onUpdate: () => void;
}

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  facebook: "bg-blue-500",
  pinterest: "bg-red-500",
  tiktok: "bg-black",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  facebook: "Facebook",
  pinterest: "Pinterest",
  tiktok: "TikTok",
};

export function PlatformPreviewCard({
  output,
  contentId,
  onUpdate,
}: PlatformPreviewCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedCopy, setEditedCopy] = useState(
    output.editedCopy || output.rewrittenCopy || ""
  );
  const [editedHashtags, setEditedHashtags] = useState(
    (output.editedHashtags.length > 0 ? output.editedHashtags : output.hashtags).join(
      " "
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const displayCopy = output.editedCopy || output.rewrittenCopy;
  const displayHashtags =
    output.editedHashtags.length > 0 ? output.editedHashtags : output.hashtags;
  const isFailed = !output.rewrittenCopy;

  const handleCopy = () => {
    const fullText = `${displayCopy}\n\n${displayHashtags.join(" ")}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Copied to clipboard");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const hashtags = editedHashtags
        .split(/\s+/)
        .filter((h) => h.startsWith("#"))
        .map((h) => h.trim());

      const response = await fetch(
        `/api/content/${contentId}/outputs/${output.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editedCopy,
            editedHashtags: hashtags,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Changes saved");
        setIsEditOpen(false);
        onUpdate();
      } else {
        toast.error(data.error?.message || "Failed to save changes");
      }
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isFailed) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${platformColors[output.platform]}`}
              />
              {platformLabels[output.platform]}
            </span>
            <Badge variant="destructive">Failed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Generation failed for this platform
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${platformColors[output.platform]}`}
              />
              {platformLabels[output.platform]}
            </span>
            {output.userEdited && (
              <Badge variant="secondary">Edited</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {output.optimizedImageUrl && (
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              <Image
                src={output.optimizedImageUrl}
                alt={`${output.platform} preview`}
                fill
                className="object-cover"
              />
            </div>
          )}
          <p className="text-sm line-clamp-4">{displayCopy}</p>
          <div className="flex flex-wrap gap-1">
            {displayHashtags.slice(0, 5).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {displayHashtags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{displayHashtags.length - 5}
              </Badge>
            )}
          </div>
          {output.scheduledFor && (
            <p className="text-xs text-muted-foreground">
              Scheduled: {new Date(output.scheduledFor).toLocaleString()}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {platformLabels[output.platform]} Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Copy</label>
              <Textarea
                value={editedCopy}
                onChange={(e) => setEditedCopy(e.target.value)}
                className="mt-1 min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editedCopy.length} characters
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Hashtags</label>
              <Textarea
                value={editedHashtags}
                onChange={(e) => setEditedHashtags(e.target.value)}
                className="mt-1"
                placeholder="#hashtag1 #hashtag2 #hashtag3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate hashtags with spaces
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
