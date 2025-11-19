/**
 * Wedding Website Templates
 * Session 49: 5 Beautiful templates for guest websites
 *
 * Following October 2025 standards
 * Mobile-responsive, SEO-optimized designs
 */

export interface WeddingTemplate {
  id: string;
  name: string;
  description: string;
  preview_image: string;
  theme_colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  features: string[];
  premium: boolean;
  style: 'classic' | 'modern' | 'elegant' | 'rustic' | 'minimalist';
}

export const WEDDING_TEMPLATES: WeddingTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Elegance',
    description: 'Timeless and sophisticated design with serif fonts',
    preview_image: '/templates/classic-preview.jpg',
    theme_colors: {
      primary: '#2C3E50',
      secondary: '#C0A080',
      background: '#FFFFFF',
      text: '#333333',
      accent: '#D4AF37',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lato',
    },
    features: ['Full-width hero', 'Timeline', 'Photo gallery', 'RSVP form'],
    premium: false,
    style: 'classic',
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Clean lines and bold typography',
    preview_image: '/templates/modern-preview.jpg',
    theme_colors: {
      primary: '#000000',
      secondary: '#FFD700',
      background: '#F5F5F5',
      text: '#1A1A1A',
      accent: '#4A90E2',
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Open Sans',
    },
    features: [
      'Split screen hero',
      'Parallax scrolling',
      'Video background',
      'Interactive timeline',
    ],
    premium: false,
    style: 'modern',
  },
  {
    id: 'elegant',
    name: 'Garden Elegance',
    description: 'Floral accents and soft pastels',
    preview_image: '/templates/elegant-preview.jpg',
    theme_colors: {
      primary: '#8B7355',
      secondary: '#E8B4B8',
      background: '#FBF7F4',
      text: '#4A4A4A',
      accent: '#DDA0A8',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Nunito',
    },
    features: ['Watercolor hero', 'Animated florals', 'Story timeline', 'Guest photos'],
    premium: false,
    style: 'elegant',
  },
  {
    id: 'rustic',
    name: 'Rustic Charm',
    description: 'Warm tones and natural textures',
    preview_image: '/templates/rustic-preview.jpg',
    theme_colors: {
      primary: '#8B4513',
      secondary: '#DAA520',
      background: '#FAF3E0',
      text: '#3E2723',
      accent: '#CD853F',
    },
    fonts: {
      heading: 'Merriweather',
      body: 'Source Sans Pro',
    },
    features: [
      'Wood texture backgrounds',
      'Polaroid gallery',
      'Hand-drawn elements',
      'Vintage RSVP',
    ],
    premium: false,
    style: 'rustic',
  },
  {
    id: 'minimalist',
    name: 'Ultra Minimal',
    description: 'Less is more - focus on content',
    preview_image: '/templates/minimalist-preview.jpg',
    theme_colors: {
      primary: '#4F46E5',
      secondary: '#EC4899',
      background: '#FFFFFF',
      text: '#111827',
      accent: '#8B5CF6',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    features: [
      'Typography-focused',
      'Monochrome palette',
      'Grid layout',
      'Smooth animations',
    ],
    premium: false,
    style: 'minimalist',
  },
];

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): WeddingTemplate | undefined {
  return WEDDING_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get template colors
 */
export function getTemplateColors(templateId: string) {
  const template = getTemplate(templateId);
  return template?.theme_colors || WEDDING_TEMPLATES[0].theme_colors;
}

/**
 * Get template fonts
 */
export function getTemplateFonts(templateId: string) {
  const template = getTemplate(templateId);
  return template?.fonts || WEDDING_TEMPLATES[0].fonts;
}

/**
 * Get all templates
 */
export function getAllTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES;
}

/**
 * Get templates by style
 */
export function getTemplatesByStyle(
  style: WeddingTemplate['style']
): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.style === style);
}

/**
 * Get free templates
 */
export function getFreeTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => !t.premium);
}

/**
 * Get premium templates
 */
export function getPremiumTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.premium);
}

/**
 * Generate CSS variables from template
 */
export function generateTemplateCSS(template: WeddingTemplate): string {
  return `
    :root {
      --color-primary: ${template.theme_colors.primary};
      --color-secondary: ${template.theme_colors.secondary};
      --color-background: ${template.theme_colors.background};
      --color-text: ${template.theme_colors.text};
      --color-accent: ${template.theme_colors.accent || template.theme_colors.primary};
      --font-heading: '${template.fonts.heading}', serif;
      --font-body: '${template.fonts.body}', sans-serif;
    }
  `.trim();
}

/**
 * Load Google Fonts for template
 */
export function getTemplateFontLinks(template: WeddingTemplate): string[] {
  const fonts = [template.fonts.heading, template.fonts.body];
  const uniqueFonts = [...new Set(fonts)];

  return uniqueFonts.map(
    (font) =>
      `https://fonts.googleapis.com/css2?family=${font.replace(
        / /g,
        '+'
      )}:wght@300;400;500;600;700&display=swap`
  );
}
