import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { companies } from '@/lib/db/schema';

/**
 * ServerThemeScript - Server Component that injects theme colors directly into HTML
 * This prevents FOUC (Flash of Unstyled Content) on production deployments
 */
export async function ServerThemeScript() {
  try {
    // Get BetterAuth session
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return null;
    }

    // Get companyId from BetterAuth user object (properly typed)
    const companyId = user.companyId;

    if (!companyId) {
      return null;
    }

    // Fetch company branding using Drizzle
    const companyResult = await db
      .select({ branding: companies.branding })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const company = companyResult[0];

    if (!company?.branding) {
      return null;
    }

    // Safely parse branding - it might be null, undefined, empty object, or string
    const rawBranding = company.branding;

    // Guard against null/undefined/non-object branding
    if (!rawBranding || typeof rawBranding !== 'object' || Array.isArray(rawBranding)) {
      return null;
    }

    const branding = rawBranding as { primary_color?: string; secondary_color?: string; accent_color?: string };

    // Safely extract colors with explicit type checks
    const primary_color = typeof branding.primary_color === 'string' && branding.primary_color.length > 0
      ? branding.primary_color
      : null;
    const secondary_color = typeof branding.secondary_color === 'string' && branding.secondary_color.length > 0
      ? branding.secondary_color
      : null;
    const accent_color = typeof branding.accent_color === 'string' && branding.accent_color.length > 0
      ? branding.accent_color
      : null;

    // If no colors are defined, skip generating theme
    if (!primary_color && !secondary_color && !accent_color) {
      return null;
    }

    // Generate CSS with color palettes
    const hexToHSL = (hex: string): { h: number; s: number; l: number } | null => {
      try {
        hex = hex.replace('#', '');
        if (hex.length !== 6) return null;

        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100)
        };
      } catch {
        return null;
      }
    };

    const generatePalette = (baseHSL: { h: number; s: number; l: number }) => {
      const { h, s, l } = baseHSL;
      return {
        50: `${h} ${Math.max(s - 10, 30)}% 97%`,
        100: `${h} ${Math.max(s - 5, 35)}% 94%`,
        200: `${h} ${s}% 86%`,
        300: `${h} ${s}% 77%`,
        400: `${h} ${s}% ${Math.min(l + 10, 75)}%`,
        500: `${h} ${s}% ${l}%`,
        600: `${h} ${s}% ${Math.max(l - 15, 40)}%`,
        700: `${h} ${s}% ${Math.max(l - 25, 30)}%`,
        800: `${h} ${s}% ${Math.max(l - 35, 25)}%`,
        900: `${h} ${s}% ${Math.max(l - 48, 18)}%`,
        950: `${h} ${s}% ${Math.max(l - 58, 9)}%`,
      };
    };

    let cssVars = ':root {\n';

    // Primary colors
    if (primary_color) {
      const hsl = hexToHSL(primary_color);
      if (hsl) {
        const palette = generatePalette(hsl);
        cssVars += `  --primary: ${palette[500]};\n`;
        Object.entries(palette).forEach(([shade, value]) => {
          cssVars += `  --primary-${shade}: ${value};\n`;
        });
        const fgShade = hsl.l > 50 ? palette[950] : palette[50];
        cssVars += `  --primary-foreground: ${fgShade};\n`;
        cssVars += `  --ring: ${palette[500]};\n`;
      }
    }

    // Secondary colors
    if (secondary_color) {
      const hsl = hexToHSL(secondary_color);
      if (hsl) {
        const palette = generatePalette(hsl);
        cssVars += `  --secondary: ${palette[500]};\n`;
        Object.entries(palette).forEach(([shade, value]) => {
          cssVars += `  --secondary-${shade}: ${value};\n`;
        });
        const fgShade = hsl.l > 50 ? palette[950] : palette[50];
        cssVars += `  --secondary-foreground: ${fgShade};\n`;
      }
    }

    // Accent colors
    if (accent_color) {
      const hsl = hexToHSL(accent_color);
      if (hsl) {
        const palette = generatePalette(hsl);
        cssVars += `  --accent: ${palette[500]};\n`;
        Object.entries(palette).forEach(([shade, value]) => {
          cssVars += `  --accent-${shade}: ${value};\n`;
        });
        const fgShade = hsl.l > 50 ? palette[950] : palette[50];
        cssVars += `  --accent-foreground: ${fgShade};\n`;
      }
    }

    cssVars += '}';

    // Return inline style tag that will be injected into HTML
    return (
      <style
        dangerouslySetInnerHTML={{
          __html: cssVars,
        }}
      />
    );
  } catch (error) {
    console.error('ServerThemeScript error:', error);
    return null;
  }
}
