import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * ServerThemeScript - Server Component that injects theme colors directly into HTML
 * This prevents FOUC (Flash of Unstyled Content) on production deployments
 */
export async function ServerThemeScript() {
  try {
    // Get Clerk user ID (not from Supabase auth - accessToken config doesn't support supabase.auth methods)
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const supabase = createServerSupabaseClient();

    // Fetch user from Supabase using Clerk user ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (!(currentUser as any)?.company_id) {
      return null;
    }

    // Fetch company
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', (currentUser as any).company_id)
      .maybeSingle();

    if (!(company as any)?.branding) {
      return null;
    }

    const { primary_color, secondary_color, accent_color } = (company as any).branding;

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
