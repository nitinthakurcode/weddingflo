'use client';

import type { Database } from '@/lib/database.types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar, Flower2 } from 'lucide-react';

type Website = Database['public']['Tables']['wedding_websites']['Row'];

interface ElegantTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Garden Elegance Template
 * Session 49: Floral accents and soft pastels
 *
 * Features:
 * - Watercolor hero
 * - Animated florals
 * - Story timeline
 * - Guest photos
 */
export function ElegantTemplate({ website, template }: ElegantTemplateProps) {
  const heroSection = website.hero_section as any;
  const ourStorySection = website.our_story_section as any;

  return (
    <div className="elegant-template min-h-screen" style={{ fontFamily: template.fonts.body, backgroundColor: template.theme_colors.background }}>
      {/* Hero Section with Floral Accents */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Watercolor Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: heroSection?.image
              ? `url(${heroSection.image})`
              : `linear-gradient(135deg, ${template.theme_colors.background} 0%, ${template.theme_colors.secondary} 30%, ${template.theme_colors.primary} 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
          }}
        />

        {/* Floral Decorations */}
        <div className="absolute top-10 left-10 opacity-20">
          <Flower2 className="h-32 w-32" style={{ color: template.theme_colors.secondary }} />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20">
          <Flower2 className="h-32 w-32 rotate-45" style={{ color: template.theme_colors.secondary }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 py-20">
          <div className="mb-8">
            <Flower2 className="h-16 w-16 mx-auto mb-6" style={{ color: template.theme_colors.secondary }} />
          </div>
          <h1
            className="text-6xl md:text-7xl mb-6 italic"
            style={{
              fontFamily: template.fonts.heading,
              color: template.theme_colors.primary,
            }}
          >
            {heroSection?.title || 'Our Wedding'}
          </h1>
          <p
            className="text-2xl md:text-3xl mb-8 max-w-2xl mx-auto"
            style={{ color: template.theme_colors.text }}
          >
            {heroSection?.subtitle || 'Join us for our special day'}
          </p>
          {heroSection?.date && (
            <div
              className="flex items-center justify-center gap-3 text-xl"
              style={{ color: template.theme_colors.primary }}
            >
              <div className="w-16 h-px" style={{ backgroundColor: template.theme_colors.secondary }} />
              <Calendar className="h-5 w-5" />
              <time className="font-medium">{new Date(heroSection.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
              <div className="w-16 h-px" style={{ backgroundColor: template.theme_colors.secondary }} />
            </div>
          )}
        </div>
      </section>

      {/* Our Story Section */}
      {ourStorySection?.content && (
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Heart className="h-12 w-12 mx-auto mb-6" style={{ color: template.theme_colors.accent }} />
              <h2
                className="text-5xl mb-4 italic"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                Our Love Story
              </h2>
              <div className="w-32 h-1 mx-auto mt-6" style={{ backgroundColor: template.theme_colors.secondary }} />
            </div>

            <div className="relative">
              {/* Decorative Floral Elements */}
              <div className="absolute -left-8 top-0 opacity-10">
                <Flower2 className="h-24 w-24" style={{ color: template.theme_colors.secondary }} />
              </div>

              <div
                className="prose prose-lg max-w-none text-center"
                style={{ fontFamily: template.fonts.body, color: template.theme_colors.text }}
              >
                <p className="text-xl leading-relaxed whitespace-pre-wrap">
                  {ourStorySection.content}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer with Floral Accent */}
      <footer className="py-16 px-4 border-t" style={{ borderColor: template.theme_colors.secondary }}>
        <div className="max-w-4xl mx-auto text-center">
          <Flower2 className="h-8 w-8 mx-auto mb-4" style={{ color: template.theme_colors.secondary }} />
          <p className="text-lg mb-2" style={{ fontFamily: template.fonts.heading, color: template.theme_colors.primary }}>
            {heroSection?.title}
          </p>
          <p className="text-sm" style={{ color: template.theme_colors.text, opacity: 0.6 }}>
            Created with love using WeddingFlow
          </p>
        </div>
      </footer>
    </div>
  );
}
