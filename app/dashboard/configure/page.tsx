"use client";

import { Play, Plus, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Brand {
  id: string;
  name: string;
  profileCount: number;
  contentCount: number;
}

interface Profile {
  id: string;
  profileName: string;
  globalTone: string | null;
  targetAudience: string | null;
  createdAt: string;
}

interface PlatformConfig {
  id: string;
  platform: string;
  toneOverride: string | null;
  customInstructions: string | null;
  imageWidth: number;
  imageHeight: number;
  charLimit: number;
  hashtagCountMin: number;
  hashtagCountMax: number;
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  bestPostingTime: string | null;
  postingFrequency: string | null;
  enabled: boolean;
}

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📱" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "twitter", name: "Twitter", icon: "🐦" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "pinterest", name: "Pinterest", icon: "📌" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
];

const DEFAULT_CONFIGS: Record<string, Partial<PlatformConfig>> = {
  instagram: { imageWidth: 1080, imageHeight: 1080, charLimit: 2200, hashtagCountMin: 10, hashtagCountMax: 15 },
  linkedin: { imageWidth: 1200, imageHeight: 627, charLimit: 3000, hashtagCountMin: 3, hashtagCountMax: 5 },
  twitter: { imageWidth: 1600, imageHeight: 900, charLimit: 280, hashtagCountMin: 2, hashtagCountMax: 3 },
  facebook: { imageWidth: 1200, imageHeight: 630, charLimit: 63206, hashtagCountMin: 2, hashtagCountMax: 3 },
  pinterest: { imageWidth: 1000, imageHeight: 1500, charLimit: 500, hashtagCountMin: 5, hashtagCountMax: 10 },
  tiktok: { imageWidth: 1080, imageHeight: 1920, charLimit: 2200, hashtagCountMin: 3, hashtagCountMax: 5 },
};

export default function ConfigurePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Platform settings state
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Test state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testBody, setTestBody] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    rewrittenCopy: string;
    hashtags: string[];
  } | null>(null);

  // Dialog states
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  const [newProfile, setNewProfile] = useState({
    profileName: "",
    globalTone: "",
    targetAudience: "",
    globalDos: "",
    globalDonts: "",
  });
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Fetch brands
  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        if (data.success) {
          setBrands(data.data.brands);
          if (data.data.brands.length > 0 && !selectedBrand) {
            setSelectedBrand(data.data.brands[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch brands:", error);
        toast.error("Failed to load brands");
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, []);

  // Fetch profiles when brand changes
  useEffect(() => {
    async function fetchProfiles() {
      if (!selectedBrand) {
        setProfiles([]);
        return;
      }

      setProfilesLoading(true);
      try {
        const response = await fetch(`/api/brands/${selectedBrand.id}/profiles`);
        const data = await response.json();
        if (data.success) {
          setProfiles(data.data.profiles);
          if (data.data.profiles.length > 0) {
            setSelectedProfile(data.data.profiles[0]);
          } else {
            setSelectedProfile(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profiles:", error);
        toast.error("Failed to load profiles");
      } finally {
        setProfilesLoading(false);
      }
    }
    fetchProfiles();
  }, [selectedBrand]);

  // Fetch platform config when profile or platform changes
  useEffect(() => {
    async function fetchPlatformConfig() {
      if (!selectedProfile) {
        setPlatformConfig(null);
        return;
      }

      setPlatformLoading(true);
      try {
        const response = await fetch(
          `/api/profiles/${selectedProfile.id}/platforms/${selectedPlatform}`
        );
        const data = await response.json();
        if (data.success) {
          setPlatformConfig(data.data);
        } else {
          // Platform config doesn't exist yet, use defaults
          const defaults = DEFAULT_CONFIGS[selectedPlatform];
          setPlatformConfig({
            id: "",
            platform: selectedPlatform,
            toneOverride: null,
            customInstructions: null,
            systemPrompt: null,
            userPromptTemplate: null,
            bestPostingTime: null,
            postingFrequency: null,
            enabled: true,
            ...defaults,
          } as PlatformConfig);
        }
      } catch (error) {
        console.error("Failed to fetch platform config:", error);
      } finally {
        setPlatformLoading(false);
      }
    }
    fetchPlatformConfig();
  }, [selectedProfile, selectedPlatform]);

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;

    setIsCreatingBrand(true);
    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName }),
      });

      const data = await response.json();
      if (data.success) {
        const newBrand = {
          id: data.data.brand_id,
          name: newBrandName,
          profileCount: 0,
          contentCount: 0,
        };
        setBrands((prev) => [...prev, newBrand]);
        setSelectedBrand(newBrand);
        setNewBrandName("");
        setBrandDialogOpen(false);
        toast.success("Brand created successfully");
      } else {
        toast.error(data.error?.message || "Failed to create brand");
      }
    } catch (error) {
      toast.error("Failed to create brand");
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!selectedBrand || !newProfile.profileName.trim()) return;

    setIsCreatingProfile(true);
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: newProfile.profileName,
          globalTone: newProfile.globalTone || null,
          targetAudience: newProfile.targetAudience || null,
          globalDos: newProfile.globalDos
            ? newProfile.globalDos.split("\n").filter((l) => l.trim())
            : [],
          globalDonts: newProfile.globalDonts
            ? newProfile.globalDonts.split("\n").filter((l) => l.trim())
            : [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        const profile = {
          id: data.data.profile_id,
          profileName: newProfile.profileName,
          globalTone: newProfile.globalTone || null,
          targetAudience: newProfile.targetAudience || null,
          createdAt: new Date().toISOString(),
        };
        setProfiles((prev) => [profile, ...prev]);
        setSelectedProfile(profile);
        setNewProfile({
          profileName: "",
          globalTone: "",
          targetAudience: "",
          globalDos: "",
          globalDonts: "",
        });
        setProfileDialogOpen(false);
        toast.success("Profile created successfully");
      } else {
        toast.error(data.error?.message || "Failed to create profile");
      }
    } catch (error) {
      toast.error("Failed to create profile");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleSavePlatformConfig = async () => {
    if (!selectedProfile || !platformConfig) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/profiles/${selectedProfile.id}/platforms/${selectedPlatform}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toneOverride: platformConfig.toneOverride,
            customInstructions: platformConfig.customInstructions,
            imageWidth: platformConfig.imageWidth,
            imageHeight: platformConfig.imageHeight,
            charLimit: platformConfig.charLimit,
            hashtagCountMin: platformConfig.hashtagCountMin,
            hashtagCountMax: platformConfig.hashtagCountMax,
            systemPrompt: platformConfig.systemPrompt,
            userPromptTemplate: platformConfig.userPromptTemplate,
            bestPostingTime: platformConfig.bestPostingTime,
            postingFrequency: platformConfig.postingFrequency,
            enabled: platformConfig.enabled,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Platform settings saved");
      } else {
        toast.error(data.error?.message || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfig = async () => {
    if (!selectedProfile || !testTitle.trim() || !testBody.trim()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(
        `/api/profiles/${selectedProfile.id}/platforms/${selectedPlatform}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testTitle,
            testBody,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setTestResult({
          rewrittenCopy: data.data.testOutput.rewrittenCopy,
          hashtags: data.data.testOutput.hashtags,
        });
      } else {
        toast.error(data.error?.message || "Test failed");
      }
    } catch (error) {
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Configure" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Configure"
        description="Manage your brands, voice profiles, and platform settings"
      />
      <div className="p-6">
        <Tabs defaultValue="brands" className="space-y-6">
          <TabsList>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="profiles">Voice Profiles</TabsTrigger>
            <TabsTrigger value="platforms">Platform Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Your Brands</h2>
              <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Brand
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Brand</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="brandName">Brand Name</Label>
                      <Input
                        id="brandName"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        placeholder="Enter brand name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateBrand}
                      disabled={isCreatingBrand || !newBrandName.trim()}
                    >
                      {isCreatingBrand ? "Creating..." : "Create Brand"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {brands.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No brands yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first brand to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <Card
                    key={brand.id}
                    className={`cursor-pointer transition-colors ${
                      selectedBrand?.id === brand.id
                        ? "border-primary"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {brand.name}
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {brand.profileCount} profiles, {brand.contentCount} content
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Voice Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Voice Profiles</h2>
                {selectedBrand && (
                  <p className="text-sm text-muted-foreground">
                    for {selectedBrand.name}
                  </p>
                )}
              </div>
              <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedBrand}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Voice Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="profileName">Profile Name *</Label>
                      <Input
                        id="profileName"
                        value={newProfile.profileName}
                        onChange={(e) =>
                          setNewProfile((p) => ({
                            ...p,
                            profileName: e.target.value,
                          }))
                        }
                        placeholder="e.g., Professional, Casual, Promotional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="globalTone">Global Tone</Label>
                      <Textarea
                        id="globalTone"
                        value={newProfile.globalTone}
                        onChange={(e) =>
                          setNewProfile((p) => ({
                            ...p,
                            globalTone: e.target.value,
                          }))
                        }
                        placeholder="Describe the overall tone and voice..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <Textarea
                        id="targetAudience"
                        value={newProfile.targetAudience}
                        onChange={(e) =>
                          setNewProfile((p) => ({
                            ...p,
                            targetAudience: e.target.value,
                          }))
                        }
                        placeholder="Describe your target audience..."
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="globalDos">Do&apos;s (one per line)</Label>
                      <Textarea
                        id="globalDos"
                        value={newProfile.globalDos}
                        onChange={(e) =>
                          setNewProfile((p) => ({
                            ...p,
                            globalDos: e.target.value,
                          }))
                        }
                        placeholder="Use active voice&#10;Keep sentences short&#10;Include calls to action"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="globalDonts">Don&apos;ts (one per line)</Label>
                      <Textarea
                        id="globalDonts"
                        value={newProfile.globalDonts}
                        onChange={(e) =>
                          setNewProfile((p) => ({
                            ...p,
                            globalDonts: e.target.value,
                          }))
                        }
                        placeholder="Avoid jargon&#10;Don't use passive voice&#10;No clickbait"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateProfile}
                      disabled={isCreatingProfile || !newProfile.profileName.trim()}
                    >
                      {isCreatingProfile ? "Creating..." : "Create Profile"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {!selectedBrand ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Select a brand first to manage its profiles
                  </p>
                </CardContent>
              </Card>
            ) : profilesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : profiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No profiles yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a voice profile to define how content should be written
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <Card
                    key={profile.id}
                    className={`cursor-pointer transition-colors ${
                      selectedProfile?.id === profile.id
                        ? "border-primary"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {profile.profileName}
                        {selectedProfile?.id === profile.id && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profile.globalTone && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {profile.globalTone}
                        </p>
                      )}
                      {profile.targetAudience && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Audience:</span>{" "}
                          {profile.targetAudience}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Platform Settings Tab */}
          <TabsContent value="platforms" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Platform Settings</h2>
                {selectedProfile && (
                  <p className="text-sm text-muted-foreground">
                    for {selectedProfile.profileName}
                  </p>
                )}
              </div>
            </div>

            {!selectedProfile ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Select a voice profile first to configure platform settings
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Go to the Voice Profiles tab to select or create a profile
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
                {/* Platform Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Platforms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedPlatform === platform.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Platform Config Form */}
                <div className="space-y-6">
                  {platformLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : platformConfig ? (
                    <>
                      {/* Enable/Disable Toggle */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                Enable{" "}
                                {PLATFORMS.find((p) => p.id === selectedPlatform)?.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Include this platform when generating content
                              </p>
                            </div>
                            <Switch
                              checked={platformConfig.enabled}
                              onCheckedChange={(enabled) =>
                                setPlatformConfig((prev) =>
                                  prev ? { ...prev, enabled } : prev
                                )
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tone & Instructions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Tone & Instructions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="toneOverride">Platform Tone Override</Label>
                            <Textarea
                              id="toneOverride"
                              value={platformConfig.toneOverride || ""}
                              onChange={(e) =>
                                setPlatformConfig((prev) =>
                                  prev ? { ...prev, toneOverride: e.target.value } : prev
                                )
                              }
                              placeholder="Override the global tone for this platform..."
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty to use the global tone from your voice profile
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customInstructions">Custom Instructions</Label>
                            <Textarea
                              id="customInstructions"
                              value={platformConfig.customInstructions || ""}
                              onChange={(e) =>
                                setPlatformConfig((prev) =>
                                  prev
                                    ? { ...prev, customInstructions: e.target.value }
                                    : prev
                                )
                              }
                              placeholder="Add platform-specific instructions..."
                              rows={4}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Technical Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Technical Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="imageWidth">Image Width (px)</Label>
                              <Input
                                id="imageWidth"
                                type="number"
                                value={platformConfig.imageWidth}
                                onChange={(e) =>
                                  setPlatformConfig((prev) =>
                                    prev
                                      ? { ...prev, imageWidth: parseInt(e.target.value) || 0 }
                                      : prev
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="imageHeight">Image Height (px)</Label>
                              <Input
                                id="imageHeight"
                                type="number"
                                value={platformConfig.imageHeight}
                                onChange={(e) =>
                                  setPlatformConfig((prev) =>
                                    prev
                                      ? { ...prev, imageHeight: parseInt(e.target.value) || 0 }
                                      : prev
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="charLimit">Character Limit</Label>
                            <Input
                              id="charLimit"
                              type="number"
                              value={platformConfig.charLimit}
                              onChange={(e) =>
                                setPlatformConfig((prev) =>
                                  prev
                                    ? { ...prev, charLimit: parseInt(e.target.value) || 0 }
                                    : prev
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="hashtagMin">Min Hashtags</Label>
                              <Input
                                id="hashtagMin"
                                type="number"
                                value={platformConfig.hashtagCountMin}
                                onChange={(e) =>
                                  setPlatformConfig((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          hashtagCountMin: parseInt(e.target.value) || 0,
                                        }
                                      : prev
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hashtagMax">Max Hashtags</Label>
                              <Input
                                id="hashtagMax"
                                type="number"
                                value={platformConfig.hashtagCountMax}
                                onChange={(e) =>
                                  setPlatformConfig((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          hashtagCountMax: parseInt(e.target.value) || 0,
                                        }
                                      : prev
                                  )
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Scheduling */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Scheduling</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="bestPostingTime">Best Posting Time</Label>
                              <Input
                                id="bestPostingTime"
                                type="time"
                                value={platformConfig.bestPostingTime || ""}
                                onChange={(e) =>
                                  setPlatformConfig((prev) =>
                                    prev
                                      ? { ...prev, bestPostingTime: e.target.value }
                                      : prev
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="postingFrequency">Posting Frequency</Label>
                              <Select
                                value={platformConfig.postingFrequency || ""}
                                onValueChange={(value) =>
                                  setPlatformConfig((prev) =>
                                    prev ? { ...prev, postingFrequency: value } : prev
                                  )
                                }
                              >
                                <SelectTrigger id="postingFrequency">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="3x_per_week">3x per week</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Save Button */}
                      <div className="flex justify-end gap-4">
                        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Play className="mr-2 h-4 w-4" />
                              Test Configuration
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Test{" "}
                                {PLATFORMS.find((p) => p.id === selectedPlatform)?.name}{" "}
                                Configuration
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="testTitle">Test Title</Label>
                                <Input
                                  id="testTitle"
                                  value={testTitle}
                                  onChange={(e) => setTestTitle(e.target.value)}
                                  placeholder="Enter a test title..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="testBody">Test Body</Label>
                                <Textarea
                                  id="testBody"
                                  value={testBody}
                                  onChange={(e) => setTestBody(e.target.value)}
                                  placeholder="Enter test content..."
                                  rows={4}
                                />
                              </div>
                              {testResult && (
                                <div className="space-y-2 p-4 bg-muted rounded-lg">
                                  <h4 className="font-medium">Generated Output:</h4>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {testResult.rewrittenCopy}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {testResult.hashtags.map((tag, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleTestConfig}
                                disabled={testing || !testTitle.trim() || !testBody.trim()}
                              >
                                {testing ? "Testing..." : "Run Test"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button onClick={handleSavePlatformConfig} disabled={saving}>
                          {saving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Advanced Settings</h2>
                {selectedProfile && (
                  <p className="text-sm text-muted-foreground">
                    Custom AI prompts for {selectedProfile.profileName}
                  </p>
                )}
              </div>
            </div>

            {!selectedProfile ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Select a voice profile first to configure advanced settings
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
                {/* Platform Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Platforms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedPlatform === platform.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Advanced Config */}
                <div className="space-y-6">
                  {platformLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-48 w-full" />
                    </div>
                  ) : platformConfig ? (
                    <>
                      {/* System Prompt */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">System Prompt</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Textarea
                            value={platformConfig.systemPrompt || ""}
                            onChange={(e) =>
                              setPlatformConfig((prev) =>
                                prev ? { ...prev, systemPrompt: e.target.value } : prev
                              )
                            }
                            placeholder="Enter the system prompt for the AI..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            This is the system-level instruction given to the AI before
                            generating content. Leave empty for default.
                          </p>
                        </CardContent>
                      </Card>

                      {/* User Prompt Template */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">User Prompt Template</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Textarea
                            value={platformConfig.userPromptTemplate || ""}
                            onChange={(e) =>
                              setPlatformConfig((prev) =>
                                prev
                                  ? { ...prev, userPromptTemplate: e.target.value }
                                  : prev
                              )
                            }
                            placeholder="Enter the user prompt template..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use {"{{title}}"} and {"{{body}}"} as placeholders for the
                            content. Example: &quot;Transform this content for{" "}
                            {selectedPlatform}: {"{{title}}"} - {"{{body}}"}&quot;
                          </p>
                        </CardContent>
                      </Card>

                      {/* Save Button */}
                      <div className="flex justify-end">
                        <Button onClick={handleSavePlatformConfig} disabled={saving}>
                          {saving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
