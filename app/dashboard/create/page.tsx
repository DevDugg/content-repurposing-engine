"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter" },
  { id: "facebook", label: "Facebook" },
  { id: "pinterest", label: "Pinterest" },
  { id: "tiktok", label: "TikTok" },
] as const;

const createContentSchema = z.object({
  brandId: z.string().min(1, "Please select a brand"),
  brandVoiceProfileId: z.string().min(1, "Please select a voice profile"),
  title: z.string().min(1, "Title is required").max(500),
  body: z.string().min(1, "Body is required").max(50000),
  imageUrls: z.string().optional(),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
});

type FormData = z.infer<typeof createContentSchema>;

interface Brand {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  profileName: string;
}

export default function CreateContentPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createContentSchema),
    defaultValues: {
      brandId: "",
      brandVoiceProfileId: "",
      title: "",
      body: "",
      imageUrls: "",
      targetPlatforms: ["instagram", "linkedin", "twitter", "facebook"],
    },
  });

  const selectedBrandId = form.watch("brandId");

  // Fetch brands on mount
  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        if (data.success) {
          setBrands(data.data.brands);
        }
      } catch (error) {
        console.error("Failed to fetch brands:", error);
        toast.error("Failed to load brands");
      }
    }
    fetchBrands();
  }, []);

  // Fetch profiles when brand changes
  useEffect(() => {
    async function fetchProfiles() {
      if (!selectedBrandId) {
        setProfiles([]);
        return;
      }

      try {
        const response = await fetch(`/api/brands/${selectedBrandId}/profiles`);
        const data = await response.json();
        if (data.success) {
          setProfiles(data.data.profiles);
          // Auto-select first profile if available
          if (data.data.profiles.length > 0) {
            form.setValue("brandVoiceProfileId", data.data.profiles[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profiles:", error);
        toast.error("Failed to load voice profiles");
      }
    }
    fetchProfiles();
  }, [selectedBrandId, form]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);

    try {
      const imageUrls = data.imageUrls
        ? data.imageUrls.split("\n").filter((url) => url.trim())
        : [];

      const response = await fetch("/api/content/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: data.brandId,
          brandVoiceProfileId: data.brandVoiceProfileId,
          title: data.title,
          body: data.body,
          imageUrls,
          targetPlatforms: data.targetPlatforms,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create content");
        return;
      }

      toast.success("Content submitted for processing");
      router.push(`/dashboard/content/${result.data.content_id}`);
    } catch (error) {
      console.error("Failed to create content:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Create New Content"
        description="Transform your content into platform-optimized social media posts"
      />
      <div className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a brand" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandVoiceProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice Profile</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedBrandId || profiles.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a profile" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.profileName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your content title"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your full content body (blog post, article, etc.)"
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length.toLocaleString()}/50,000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URLs (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter one URL per line. The first image will be used for all platforms.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetPlatforms"
                  render={() => (
                    <FormItem>
                      <FormLabel>Target Platforms</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        {platforms.map((platform) => (
                          <FormField
                            key={platform.id}
                            control={form.control}
                            name="targetPlatforms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            platform.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== platform.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {platform.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Generating..." : "Generate Previews"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
