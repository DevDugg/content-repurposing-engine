"use client";

import { Clock, FileText, PlusCircle, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/content/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentContent {
  id: string;
  title: string;
  status: string;
  targetPlatforms: string[];
  brandName: string;
  outputCount: number;
  createdAt: string;
}

interface Brand {
  id: string;
  name: string;
  profileCount: number;
  contentCount: number;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📱",
  linkedin: "💼",
  twitter: "🐦",
  facebook: "📘",
  pinterest: "📌",
  tiktok: "🎵",
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [recentContent, setRecentContent] = useState<RecentContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        if (data.success) {
          setBrands(data.data.brands);
        }
      } catch (error) {
        console.error("Failed to fetch brands:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch("/api/content?limit=5");
        const data = await response.json();
        if (data.success) {
          setRecentContent(data.data.content);
        }
      } catch (error) {
        console.error("Failed to fetch content:", error);
      } finally {
        setContentLoading(false);
      }
    }
    fetchContent();
  }, []);

  const totalContent = brands.reduce((acc, b) => acc + b.contentCount, 0);

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="Welcome to Content Repurpose Engine" />
      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{brands.length}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voice Profiles</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {brands.reduce((acc, b) => acc + b.profileCount, 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Created</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalContent}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/dashboard/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Content
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/dashboard/configure">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Content</CardTitle>
            {recentContent.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Last 5 submissions
              </span>
            )}
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : recentContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No content yet. Create your first piece of content!</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/create">Create Content</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentContent.map((content) => (
                  <Link
                    key={content.id}
                    href={`/dashboard/content/${content.id}`}
                    className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{content.title}</h3>
                          <StatusBadge status={content.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{content.brandName}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(content.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {content.targetPlatforms.slice(0, 4).map((platform) => (
                          <span
                            key={platform}
                            className="text-sm"
                            title={platform}
                          >
                            {PLATFORM_ICONS[platform] || platform}
                          </span>
                        ))}
                        {content.targetPlatforms.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{content.targetPlatforms.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brands Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Brands</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/configure">Manage Brands</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No brands yet. Create your first brand to get started.</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/configure">Create Brand</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {brand.profileCount} profiles, {brand.contentCount} content pieces
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/configure?brand=${brand.id}`}>
                        Configure
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
