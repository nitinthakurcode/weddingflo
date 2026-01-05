/**
 * Wedding Website Templates
 * December 2025: 20 Beautiful templates for guest websites
 *
 * Following December 2025 standards
 * Mobile-responsive, SEO-optimized designs
 */

export type TemplateStyle =
  | 'classic'
  | 'modern'
  | 'elegant'
  | 'rustic'
  | 'minimalist'
  | 'bohemian'
  | 'tropical'
  | 'vintage'
  | 'glamour'
  | 'coastal'
  | 'garden'
  | 'industrial'
  | 'romantic'
  | 'whimsical'
  | 'luxury';

export type TemplateCategory = 'free' | 'premium' | 'exclusive';

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
  category: TemplateCategory;
  style: TemplateStyle;
  tags: string[];
}

export const WEDDING_TEMPLATES: WeddingTemplate[] = [
  // ============================================
  // FREE TEMPLATES (5)
  // ============================================
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
    category: 'free',
    style: 'classic',
    tags: ['traditional', 'timeless', 'formal'],
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
    category: 'free',
    style: 'modern',
    tags: ['contemporary', 'clean', 'bold'],
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
    category: 'free',
    style: 'elegant',
    tags: ['floral', 'romantic', 'soft'],
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
    category: 'free',
    style: 'rustic',
    tags: ['barn', 'country', 'natural'],
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
    category: 'free',
    style: 'minimalist',
    tags: ['simple', 'clean', 'modern'],
  },

  // ============================================
  // PREMIUM TEMPLATES (10)
  // ============================================
  {
    id: 'bohemian',
    name: 'Bohemian Dream',
    description: 'Free-spirited design with earthy tones and artistic flair',
    preview_image: '/templates/bohemian-preview.jpg',
    theme_colors: {
      primary: '#A0522D',
      secondary: '#E6BE8A',
      background: '#FFF8F0',
      text: '#4A3728',
      accent: '#C19A6B',
    },
    fonts: {
      heading: 'Amatic SC',
      body: 'Quicksand',
    },
    features: [
      'Macrame-inspired borders',
      'Watercolor backgrounds',
      'Dreamy photo filters',
      'Handwritten accents',
    ],
    premium: true,
    category: 'premium',
    style: 'bohemian',
    tags: ['boho', 'free-spirit', 'artistic', 'outdoor'],
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    description: 'Vibrant palm leaves and exotic florals for destination weddings',
    preview_image: '/templates/tropical-preview.jpg',
    theme_colors: {
      primary: '#1E5631',
      secondary: '#FF6B6B',
      background: '#FFFBF0',
      text: '#2D3436',
      accent: '#00CEC9',
    },
    fonts: {
      heading: 'Pacifico',
      body: 'Poppins',
    },
    features: [
      'Animated palm leaves',
      'Tropical color scheme',
      'Beach countdown timer',
      'Travel info section',
    ],
    premium: true,
    category: 'premium',
    style: 'tropical',
    tags: ['beach', 'destination', 'colorful', 'island'],
  },
  {
    id: 'vintage',
    name: 'Vintage Romance',
    description: 'Nostalgic charm with antique elements and sepia tones',
    preview_image: '/templates/vintage-preview.jpg',
    theme_colors: {
      primary: '#704214',
      secondary: '#D4A574',
      background: '#F5EDE0',
      text: '#3D2914',
      accent: '#B8860B',
    },
    fonts: {
      heading: 'Cinzel',
      body: 'EB Garamond',
    },
    features: [
      'Antique photo frames',
      'Decorative flourishes',
      'Sepia photo filters',
      'Ornate borders',
    ],
    premium: true,
    category: 'premium',
    style: 'vintage',
    tags: ['retro', 'antique', 'nostalgic', '1920s'],
  },
  {
    id: 'glamour',
    name: 'Hollywood Glamour',
    description: 'Art deco inspired luxury with gold accents',
    preview_image: '/templates/glamour-preview.jpg',
    theme_colors: {
      primary: '#1A1A2E',
      secondary: '#D4AF37',
      background: '#0F0F1A',
      text: '#F0E6D2',
      accent: '#C5A55A',
    },
    fonts: {
      heading: 'Poiret One',
      body: 'Josefin Sans',
    },
    features: [
      'Art deco patterns',
      'Gold foil effects',
      'Dramatic animations',
      'Luxury feel',
    ],
    premium: true,
    category: 'premium',
    style: 'glamour',
    tags: ['luxury', 'art-deco', 'gold', 'black-tie'],
  },
  {
    id: 'coastal',
    name: 'Coastal Breeze',
    description: 'Soft blues and sandy neutrals for seaside celebrations',
    preview_image: '/templates/coastal-preview.jpg',
    theme_colors: {
      primary: '#3B82A0',
      secondary: '#E8D5B7',
      background: '#F7FBFC',
      text: '#2C4A52',
      accent: '#89CFF0',
    },
    fonts: {
      heading: 'Raleway',
      body: 'Work Sans',
    },
    features: [
      'Wave animations',
      'Sandy textures',
      'Nautical accents',
      'Weather widget',
    ],
    premium: true,
    category: 'premium',
    style: 'coastal',
    tags: ['beach', 'ocean', 'nautical', 'seaside'],
  },
  {
    id: 'garden',
    name: 'Secret Garden',
    description: 'Lush greenery and blooming florals for outdoor weddings',
    preview_image: '/templates/garden-preview.jpg',
    theme_colors: {
      primary: '#2D5A27',
      secondary: '#F4A7BB',
      background: '#FDFFF5',
      text: '#1A3318',
      accent: '#8FBC8F',
    },
    fonts: {
      heading: 'Libre Baskerville',
      body: 'Lato',
    },
    features: [
      'Botanical illustrations',
      'Animated butterflies',
      'Garden gate intro',
      'Floral borders',
    ],
    premium: true,
    category: 'premium',
    style: 'garden',
    tags: ['outdoor', 'nature', 'botanical', 'green'],
  },
  {
    id: 'industrial',
    name: 'Urban Industrial',
    description: 'Edgy design with exposed brick and metallic accents',
    preview_image: '/templates/industrial-preview.jpg',
    theme_colors: {
      primary: '#2C2C2C',
      secondary: '#B87333',
      background: '#F5F5F5',
      text: '#1A1A1A',
      accent: '#708090',
    },
    fonts: {
      heading: 'Bebas Neue',
      body: 'Roboto',
    },
    features: [
      'Exposed brick textures',
      'Copper accents',
      'Geometric shapes',
      'Urban gallery',
    ],
    premium: true,
    category: 'premium',
    style: 'industrial',
    tags: ['urban', 'loft', 'modern', 'edgy'],
  },
  {
    id: 'romantic',
    name: 'Eternal Romance',
    description: 'Soft and dreamy with blush tones and delicate details',
    preview_image: '/templates/romantic-preview.jpg',
    theme_colors: {
      primary: '#C9A9A6',
      secondary: '#F5E6E8',
      background: '#FFFAFA',
      text: '#5C4A4A',
      accent: '#E8B4B8',
    },
    fonts: {
      heading: 'Great Vibes',
      body: 'Crimson Text',
    },
    features: [
      'Soft focus effects',
      'Heart animations',
      'Love story timeline',
      'Romantic quotes',
    ],
    premium: true,
    category: 'premium',
    style: 'romantic',
    tags: ['love', 'soft', 'pink', 'dreamy'],
  },
  {
    id: 'whimsical',
    name: 'Whimsical Wonderland',
    description: 'Playful and magical with illustrated elements',
    preview_image: '/templates/whimsical-preview.jpg',
    theme_colors: {
      primary: '#6B5B95',
      secondary: '#FF6F61',
      background: '#FFF9FB',
      text: '#4A4063',
      accent: '#88B04B',
    },
    fonts: {
      heading: 'Caveat',
      body: 'Nunito Sans',
    },
    features: [
      'Illustrated characters',
      'Animated confetti',
      'Playful animations',
      'Interactive elements',
    ],
    premium: true,
    category: 'premium',
    style: 'whimsical',
    tags: ['fun', 'playful', 'illustrated', 'colorful'],
  },
  {
    id: 'luxury',
    name: 'Opulent Luxury',
    description: 'Refined elegance with marble and velvet textures',
    preview_image: '/templates/luxury-preview.jpg',
    theme_colors: {
      primary: '#2C1810',
      secondary: '#C9B037',
      background: '#FDFCF9',
      text: '#1A1A1A',
      accent: '#8B7355',
    },
    fonts: {
      heading: 'Bodoni Moda',
      body: 'Quattrocento Sans',
    },
    features: [
      'Marble backgrounds',
      'Gold leaf effects',
      'Elegant transitions',
      'VIP guest section',
    ],
    premium: true,
    category: 'premium',
    style: 'luxury',
    tags: ['upscale', 'marble', 'gold', 'sophisticated'],
  },

  // ============================================
  // EXCLUSIVE TEMPLATES (5)
  // ============================================
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    description: 'Japanese-inspired elegance with cherry blossom motifs',
    preview_image: '/templates/sakura-preview.jpg',
    theme_colors: {
      primary: '#8B4557',
      secondary: '#FFB7C5',
      background: '#FFF9F9',
      text: '#2D1F21',
      accent: '#FF69B4',
    },
    fonts: {
      heading: 'Noto Serif JP',
      body: 'Noto Sans JP',
    },
    features: [
      'Falling petals animation',
      'Japanese patterns',
      'Zen garden gallery',
      'Haiku-style timeline',
    ],
    premium: true,
    category: 'exclusive',
    style: 'elegant',
    tags: ['japanese', 'asian', 'spring', 'cherry-blossom'],
  },
  {
    id: 'celestial',
    name: 'Celestial Night',
    description: 'Starry night theme with celestial bodies and constellations',
    preview_image: '/templates/celestial-preview.jpg',
    theme_colors: {
      primary: '#1A1A2E',
      secondary: '#E8D1C5',
      background: '#0D1B2A',
      text: '#E0E0E0',
      accent: '#FFD700',
    },
    fonts: {
      heading: 'Cinzel Decorative',
      body: 'Raleway',
    },
    features: [
      'Animated stars',
      'Moon phases',
      'Constellation map',
      'Zodiac compatibility',
    ],
    premium: true,
    category: 'exclusive',
    style: 'modern',
    tags: ['stars', 'night', 'mystical', 'dark'],
  },
  {
    id: 'tuscan',
    name: 'Tuscan Vineyard',
    description: 'Italian countryside warmth with vineyard and olive motifs',
    preview_image: '/templates/tuscan-preview.jpg',
    theme_colors: {
      primary: '#722F37',
      secondary: '#8B9A46',
      background: '#FDF8F3',
      text: '#3D2B1F',
      accent: '#C5A880',
    },
    fonts: {
      heading: 'Cormorant Infant',
      body: 'Source Serif Pro',
    },
    features: [
      'Vineyard imagery',
      'Wine pairing guide',
      'Italian locale info',
      'Rustic elegance',
    ],
    premium: true,
    category: 'exclusive',
    style: 'rustic',
    tags: ['italian', 'wine', 'vineyard', 'mediterranean'],
  },
  {
    id: 'moroccan',
    name: 'Moroccan Nights',
    description: 'Exotic patterns and rich jewel tones inspired by Morocco',
    preview_image: '/templates/moroccan-preview.jpg',
    theme_colors: {
      primary: '#B8860B',
      secondary: '#1E3A5F',
      background: '#FFF8E7',
      text: '#2D2D2D',
      accent: '#C41E3A',
    },
    fonts: {
      heading: 'Amiri',
      body: 'Lato',
    },
    features: [
      'Geometric patterns',
      'Lantern animations',
      'Mosaic gallery',
      'Exotic typography',
    ],
    premium: true,
    category: 'exclusive',
    style: 'glamour',
    tags: ['moroccan', 'exotic', 'middle-eastern', 'colorful'],
  },
  {
    id: 'enchanted',
    name: 'Enchanted Forest',
    description: 'Magical woodland theme with fairy lights and forest elements',
    preview_image: '/templates/enchanted-preview.jpg',
    theme_colors: {
      primary: '#1B4D3E',
      secondary: '#F4E7D1',
      background: '#0D1F17',
      text: '#E8E4D9',
      accent: '#FFD93D',
    },
    fonts: {
      heading: 'Cinzel',
      body: 'Spectral',
    },
    features: [
      'Fairy light particles',
      'Forest ambient sounds',
      'Mystical photo frames',
      'Enchanted timeline',
    ],
    premium: true,
    category: 'exclusive',
    style: 'whimsical',
    tags: ['forest', 'fairy', 'magical', 'woodland'],
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
export function getTemplatesByStyle(style: TemplateStyle): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.style === style);
}

/**
 * Get free templates
 */
export function getFreeTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.category === 'free');
}

/**
 * Get premium templates
 */
export function getPremiumTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.category === 'premium');
}

/**
 * Get exclusive templates
 */
export function getExclusiveTemplates(): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.category === 'exclusive');
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TemplateCategory
): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): WeddingTemplate[] {
  return WEDDING_TEMPLATES.filter((t) =>
    t.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): WeddingTemplate[] {
  const q = query.toLowerCase();
  return WEDDING_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  WEDDING_TEMPLATES.forEach((t) => t.tags.forEach((tag) => tags.add(tag)));
  return Array.from(tags).sort();
}

/**
 * Get template count by category
 */
export function getTemplateCounts(): {
  total: number;
  free: number;
  premium: number;
  exclusive: number;
} {
  return {
    total: WEDDING_TEMPLATES.length,
    free: WEDDING_TEMPLATES.filter((t) => t.category === 'free').length,
    premium: WEDDING_TEMPLATES.filter((t) => t.category === 'premium').length,
    exclusive: WEDDING_TEMPLATES.filter((t) => t.category === 'exclusive')
      .length,
  };
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
