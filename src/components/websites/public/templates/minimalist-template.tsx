'use client';

import type { WeddingWebsite } from '@/lib/db/types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar } from 'lucide-react';

type Website = WeddingWebsite;

interface MinimalistTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Ultra Minimal Template
 * Session 49: Less is more - focus on content
 *
 * Features:
 * - Typography-focused
 * - Monochrome palette
 * - Grid layout
 * - Smooth animations
 */
export function MinimalistTemplate({ website, template }: MinimalistTemplateProps) {
  const content = website.content as Record<string, any> || {};
  const heroSection = content.hero_section as any;
  const ourStorySection = content.our_story_section as any;

  return (
    <div className="minimalist-template min-h-screen bg-white" style={{ fontFamily: template.fonts.body }}>
      {/* Hero Section - Ultra Minimal */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-4xl w-full">
          <div className="space-y-12">
            {/* Names */}
            <div className="text-center">
              <h1
                className="text-8xl md:text-9xl font-black tracking-tight leading-none"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                {heroSection?.title?.split(' & ').map((name: string, i: number) => (
                  <div key={i}>
                    {name}
                    {i === 0 && <span className="text-6xl mx-4" style={{ color: template.theme_colors.accent }}>&</span>}
                  </div>
                )) || 'WEDDING'}
              </h1>
            </div>

            {/* Subtitle */}
            <div className="text-center">
              <p
                className="text-2xl tracking-widest uppercase"
                style={{ color: template.theme_colors.text, letterSpacing: '0.3em' }}
              >
                {heroSection?.subtitle || 'Getting Married'}
              </p>
            </div>

            {/* Date - Minimal Line */}
            {heroSection?.date && (
              <div className="flex items-center justify-center gap-8">
                <div className="h-px w-32" style={{ backgroundColor: template.theme_colors.primary }} />
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" style={{ color: template.theme_colors.accent }} />
                  <time
                    className="text-lg tracking-wide"
                    style={{ color: template.theme_colors.text }}
                  >
                    {new Date(heroSection.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric',
                    }).replace(/\s/g, ' · ')}
                  </time>
                </div>
                <div className="h-px w-32" style={{ backgroundColor: template.theme_colors.primary }} />
              </div>
            )}

            {/* Hero Image (if provided) - Minimal Frame */}
            {heroSection?.image && (
              <div className="mt-16">
                <div className="aspect-video w-full overflow-hidden border-2" style={{ borderColor: template.theme_colors.primary }}>
                  <img
                    src={heroSection.image}
                    alt="Wedding"
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Our Story - Grid Layout */}
      {ourStorySection?.content && (
        <section className="py-32 px-4 bg-mocha-50 dark:bg-mocha-900">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-12 gap-12">
              {/* Left Column - Header */}
              <div className="md:col-span-4">
                <div className="sticky top-8">
                  <Heart
                    className="h-12 w-12 mb-6"
                    style={{ color: template.theme_colors.accent }}
                  />
                  <h2
                    className="text-6xl font-black tracking-tight"
                    style={{
                      fontFamily: template.fonts.heading,
                      color: template.theme_colors.primary,
                    }}
                  >
                    OUR
                    <br />
                    STORY
                  </h2>
                  <div className="w-24 h-1 mt-6" style={{ backgroundColor: template.theme_colors.accent }} />
                </div>
              </div>

              {/* Right Column - Content */}
              <div className="md:col-span-8">
                <div
                  className="prose prose-xl max-w-none"
                  style={{ fontFamily: template.fonts.body, color: template.theme_colors.text }}
                >
                  <p className="text-2xl leading-relaxed whitespace-pre-wrap">
                    {ourStorySection.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer - Minimal */}
      <footer className="py-24 px-4 border-t" style={{ borderColor: template.theme_colors.text, borderWidth: '1px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p
                className="text-2xl font-bold tracking-tight"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                {heroSection?.title}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm tracking-widest uppercase" style={{ color: template.theme_colors.text, opacity: 0.5 }}>
                Powered by WeddingFlow
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
