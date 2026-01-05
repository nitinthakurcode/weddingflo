'use client';

import type { WeddingWebsite } from '@/lib/db/types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar, TreePine } from 'lucide-react';

type Website = WeddingWebsite;

interface RusticTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Rustic Charm Template
 * Session 49: Warm tones and natural textures
 *
 * Features:
 * - Wood texture backgrounds
 * - Polaroid gallery
 * - Hand-drawn elements
 * - Vintage RSVP
 */
export function RusticTemplate({ website, template }: RusticTemplateProps) {
  const content = website.content as Record<string, any> || {};
  const heroSection = content.hero_section as any;
  const ourStorySection = content.our_story_section as any;

  return (
    <div className="rustic-template min-h-screen" style={{ fontFamily: template.fonts.body }}>
      {/* Hero Section with Wood Texture */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: heroSection?.image
            ? `url(${heroSection.image})`
            : `linear-gradient(135deg, ${template.theme_colors.primary} 0%, ${template.theme_colors.background} 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />

        {/* Pine Tree Decorations */}
        <div className="absolute top-10 left-10 opacity-30">
          <TreePine className="h-24 w-24 text-white" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-30">
          <TreePine className="h-24 w-24 text-white" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 text-white">
          <div
            className="inline-block px-8 py-12 border-4 border-white/30"
            style={{ backgroundColor: 'color-mix(in srgb, var(--mocha-600, #6B5D4F) 30%, transparent)' }}
          >
            <h1
              className="text-6xl md:text-8xl mb-4"
              style={{
                fontFamily: template.fonts.heading,
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {heroSection?.title || 'Our Wedding'}
            </h1>
            <div className="w-32 h-1 bg-white/50 mx-auto my-6" />
            <p className="text-2xl md:text-3xl mb-8" style={{ fontFamily: template.fonts.body }}>
              {heroSection?.subtitle || 'A celebration of love'}
            </p>
            {heroSection?.date && (
              <div className="flex items-center justify-center gap-3 text-xl">
                <Calendar className="h-6 w-6" />
                <time>{new Date(heroSection.date).toLocaleDateString()}</time>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      {ourStorySection?.content && (
        <section className="py-24 px-4" style={{ backgroundColor: template.theme_colors.background }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block">
                <Heart
                  className="h-16 w-16 mx-auto mb-6"
                  style={{ color: template.theme_colors.secondary }}
                />
                <h2
                  className="text-5xl mb-4"
                  style={{
                    fontFamily: template.fonts.heading,
                    color: template.theme_colors.primary,
                  }}
                >
                  Our Story
                </h2>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-16 h-0.5" style={{ backgroundColor: template.theme_colors.secondary }} />
                  <TreePine className="h-6 w-6" style={{ color: template.theme_colors.secondary }} />
                  <div className="w-16 h-0.5" style={{ backgroundColor: template.theme_colors.secondary }} />
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              {/* Vintage Paper Effect */}
              <div
                className="p-8 shadow-lg border-4"
                style={{
                  backgroundColor: 'var(--cream-50, #FFF8E7)',
                  borderColor: template.theme_colors.primary,
                  borderStyle: 'double',
                }}
              >
                <p
                  className="text-xl leading-relaxed whitespace-pre-wrap text-center"
                  style={{
                    fontFamily: template.fonts.body,
                    color: template.theme_colors.text,
                  }}
                >
                  {ourStorySection.content}
                </p>
              </div>
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
          <TreePine className="h-12 w-12 mx-auto mb-4 opacity-70" />
          <p className="text-xl mb-2" style={{ fontFamily: template.fonts.heading }}>
            {heroSection?.title}
          </p>
          <div className="w-24 h-0.5 bg-white/30 mx-auto my-4" />
          <p className="text-sm opacity-70">Made with love • Powered by WeddingFlow</p>
        </div>
      </footer>
    </div>
  );
}
