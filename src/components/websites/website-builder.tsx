'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Save, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type Website = Database['public']['Tables']['wedding_websites']['Row'];

interface WebsiteBuilderProps {
  website: Website;
  onUpdate: () => void;
}

/**
 * Website Content Builder
 * Session 49: WYSIWYG-style content editor
 *
 * Sections:
 * - Hero (title, subtitle, date, image)
 * - Our Story
 * - Wedding Party
 * - Event Details
 * - Travel Info
 * - Registry Links
 * - Photo Gallery
 */
export function WebsiteBuilder({ website, onUpdate }: WebsiteBuilderProps) {
  const [heroTitle, setHeroTitle] = useState(
    (website.hero_section as any)?.title || ''
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    (website.hero_section as any)?.subtitle || ''
  );
  const [heroDate, setHeroDate] = useState(
    (website.hero_section as any)?.date || ''
  );
  const [heroImage, setHeroImage] = useState(
    (website.hero_section as any)?.image || ''
  );

  const [ourStory, setOurStory] = useState(
    (website.our_story_section as any)?.content || ''
  );

  const updateWebsite = trpc.websites.update.useMutation({
    onSuccess: () => {
      toast.success('Website updated!');
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveHero = () => {
    updateWebsite.mutate({
      websiteId: website.id,
      data: {
        heroSection: {
          title: heroTitle,
          subtitle: heroSubtitle,
          date: heroDate,
          image: heroImage,
        },
      },
    });
  };

  const handleSaveStory = () => {
    updateWebsite.mutate({
      websiteId: website.id,
      data: {
        ourStorySection: {
          content: ourStory,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>
            The first thing guests see when they visit your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Title</Label>
            <Input
              id="hero-title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="John & Jane"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtitle</Label>
            <Input
              id="hero-subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="We're getting married!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-date">Wedding Date</Label>
            <Input
              id="hero-date"
              type="date"
              value={heroDate}
              onChange={(e) => setHeroDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-image">Hero Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="hero-image"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <Button variant="outline" size="icon">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
            {heroImage && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <img
                  src={heroImage}
                  alt="Hero preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSaveHero} disabled={updateWebsite.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Hero Section
          </Button>
        </CardContent>
      </Card>

      {/* Our Story Section */}
      <Card>
        <CardHeader>
          <CardTitle>Our Story</CardTitle>
          <CardDescription>
            Share your love story with your guests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="our-story">Your Story</Label>
            <Textarea
              id="our-story"
              value={ourStory}
              onChange={(e) => setOurStory(e.target.value)}
              placeholder="Tell your guests how you met, fell in love, and got engaged..."
              rows={8}
            />
          </div>

          <Button onClick={handleSaveStory} disabled={updateWebsite.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Story Section
          </Button>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Ceremony and reception information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Event details coming soon. For now, you can add this information to the Our Story section.
          </p>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Photo Gallery</CardTitle>
          <CardDescription>
            Share engagement photos and memories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Photo gallery coming soon. You can upload up to 100 photos on the free plan.
          </p>
        </CardContent>
      </Card>

      {/* Registry Links */}
      <Card>
        <CardHeader>
          <CardTitle>Registry</CardTitle>
          <CardDescription>
            Add links to your wedding registries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Registry Link
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Registry links coming soon. Add Amazon, Target, Zola, and other registries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
