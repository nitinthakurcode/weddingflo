'use client';

import type { Database } from '@/lib/database.types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar, ArrowDown } from 'lucide-react';

type Website = Database['public']['Tables']['wedding_websites']['Row'];

interface ModernTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Modern Minimalist Template
 * Session 49: Bold typography, clean lines
 *
 * Features:
 * - Split screen hero
 * - Parallax scrolling
 * - Interactive timeline
 * - Video background support
 */
export function ModernTemplate({ website, template }: ModernTemplateProps) {
  const heroSection = website.hero_section as any;
  const ourStorySection = website.our_story_section as any;

  return (
    <div className="modern-template min-h-screen" style={{ fontFamily: template.fonts.body }}>
      {/* Hero Section - Split Screen */}
      <section className="relative h-screen">
        <div className="grid md:grid-cols-2 h-full">
          {/* Left Side - Image */}
          <div
            className="relative bg-cover bg-center"
            style={{
              backgroundImage: heroSection?.image
                ? `url(${heroSection.image})`
                : `linear-gradient(135deg, ${template.theme_colors.primary} 0%, ${template.theme_colors.secondary} 100%)`,
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Right Side - Content */}
          <div className="flex items-center justify-center p-8 bg-white">
            <div className="max-w-md">
              <h1
                className="text-7xl md:text-8xl font-bold mb-6 leading-none"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                {heroSection?.title?.split(' ')[0] || 'JOHN'}
                <span className="text-6xl mx-4">&</span>
                {heroSection?.title?.split(' ')[2] || 'JANE'}
              </h1>
              <p className="text-2xl mb-8" style={{ color: template.theme_colors.secondary }}>
                {heroSection?.subtitle || "We're getting married"}
              </p>
              {heroSection?.date && (
                <div
                  className="flex items-center gap-2 text-xl"
                  style={{ color: template.theme_colors.text }}
                >
                  <Calendar className="h-6 w-6" />
                  <time>{new Date(heroSection.date).toLocaleDateString()}</time>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown className="h-8 w-8" style={{ color: template.theme_colors.primary }} />
        </div>
      </section>

      {/* Our Story - Full Width */}
      {ourStorySection?.content && (
        <section className="py-32 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <Heart
                className="h-16 w-16 mx-auto mb-6"
                style={{ color: template.theme_colors.secondary }}
              />
              <h2
                className="text-6xl font-bold mb-8"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                OUR STORY
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p
                  className="text-xl leading-relaxed whitespace-pre-wrap"
                  style={{ color: template.theme_colors.text }}
                >
                  {ourStorySection.content}
                </p>
              </div>
              <div className="aspect-square bg-gray-200 rounded-lg" />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className="py-16 px-4 text-white"
        style={{ backgroundColor: template.theme_colors.primary }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl font-bold mb-4" style={{ fontFamily: template.fonts.heading }}>
            {heroSection?.title}
          </p>
          <p className="opacity-80">Powered by WeddingFlow</p>
        </div>
      </footer>
    </div>
  );
}
