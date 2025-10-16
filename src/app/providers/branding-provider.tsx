'use client';

import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const supabase = createClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: company } = useQuery({
    queryKey: ['company', currentUser?.company_id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!currentUser?.company_id) return null;
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentUser.company_id)
        .single();
      return data;
    },
    enabled: !!currentUser?.company_id,
  });

  console.log('🔍 BrandingProvider:', { hasUser: !!currentUser, hasCompany: !!company, company });

  useEffect(() => {
    console.log('🔍 BrandingProvider useEffect triggered, company?.branding =', company?.branding);

    if (!company?.branding) {
      console.log('⚠️ BrandingProvider: No branding data, skipping');
      return;
    }

    console.log('✅ BrandingProvider: Starting to apply colors:', company.branding);

    const { primary_color, secondary_color, accent_color, text_color, font_family, custom_css } = company.branding;

    // Convert hex to HSL and return as object
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
      } catch (error) {
        console.error('Error converting hex to HSL:', error);
        return null;
      }
    };

    // Generate complete color palette (50-950) from base color
    const generatePalette = (baseHSL: { h: number; s: number; l: number }) => {
      const { h, s, l } = baseHSL;

      // Use the original color's lightness as the base (500 shade)
      // Generate lighter and darker shades around it
      return {
        50: `${h} ${Math.max(s - 10, 30)}% 97%`,    // Very light
        100: `${h} ${Math.max(s - 5, 35)}% 94%`,    // Light
        200: `${h} ${s}% 86%`,                       // Lighter
        300: `${h} ${s}% 77%`,                       // Light-medium
        400: `${h} ${s}% ${Math.min(l + 10, 75)}%`, // Medium (lighter than base)
        500: `${h} ${s}% ${l}%`,                     // Base (ORIGINAL color preserved!)
        600: `${h} ${s}% ${Math.max(l - 15, 40)}%`, // Medium-dark
        700: `${h} ${s}% ${Math.max(l - 25, 30)}%`, // Dark
        800: `${h} ${s}% ${Math.max(l - 35, 25)}%`, // Darker
        900: `${h} ${s}% ${Math.max(l - 48, 18)}%`, // Very dark (for text)
        950: `${h} ${s}% ${Math.max(l - 58, 9)}%`,  // Almost black (for text)
      };
    };

    // Determine if a color is light or dark for contrast
    const isLightColor = (l: number) => l > 50;

    const root = document.documentElement;

    // Process primary color
    if (primary_color) {
      const hsl = hexToHSL(primary_color);
      if (hsl) {
        const palette = generatePalette(hsl);

        // Set base primary
        root.style.setProperty('--primary', palette[500]);

        // Set all shades
        Object.entries(palette).forEach(([shade, value]) => {
          root.style.setProperty(`--primary-${shade}`, value);
        });

        // Smart foreground: if primary is light, use dark text, if dark, use light text
        const fgShade = isLightColor(hsl.l) ? palette[950] : palette[50];
        root.style.setProperty('--primary-foreground', fgShade);

        // Set smart text color for headings (always dark but themed)
        root.style.setProperty('--heading-color', palette[900]);

        // Set smart text color for body (themed but readable)
        root.style.setProperty('--body-color', palette[800]);

        // Ring color for focus
        root.style.setProperty('--ring', palette[500]);

        console.log('✅ Primary palette generated:', primary_color, '→', palette);
      }
    }

    // Process secondary color
    if (secondary_color) {
      const hsl = hexToHSL(secondary_color);
      if (hsl) {
        const palette = generatePalette(hsl);

        root.style.setProperty('--secondary', palette[500]);

        Object.entries(palette).forEach(([shade, value]) => {
          root.style.setProperty(`--secondary-${shade}`, value);
        });

        const fgShade = isLightColor(hsl.l) ? palette[950] : palette[50];
        root.style.setProperty('--secondary-foreground', fgShade);

        console.log('✅ Secondary palette generated:', secondary_color, '→', palette);
      }
    }

    // Process accent color
    if (accent_color) {
      const hsl = hexToHSL(accent_color);
      if (hsl) {
        const palette = generatePalette(hsl);

        root.style.setProperty('--accent', palette[500]);

        Object.entries(palette).forEach(([shade, value]) => {
          root.style.setProperty(`--accent-${shade}`, value);
        });

        const fgShade = isLightColor(hsl.l) ? palette[950] : palette[50];
        root.style.setProperty('--accent-foreground', fgShade);

        console.log('✅ Accent palette generated:', accent_color, '→', palette);
      }
    }

    // Apply font family with Google Fonts loading
    if (font_family) {
      // Extract just the font name (before the comma)
      const fontName = font_family.split(',')[0].trim().replace(/['"]/g, '');

      // Check if this is a Google Font (not a system font)
      const isGoogleFont = ![
        'system-ui',
        'ui-sans-serif',
        '-apple-system',
        'BlinkMacSystemFont',
        'Arial',
        'Helvetica',
        'sans-serif',
        'serif',
        'monospace',
      ].includes(fontName);

      // Load Google Font dynamically if needed
      if (isGoogleFont && !document.querySelector(`link[href*="${fontName}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
        console.log('🔤 Loading Google Font:', fontName);
      }

      // Set the CSS variable
      root.style.setProperty('--font-sans', `${font_family}, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`);

      // Also apply directly to body as backup
      document.body.style.fontFamily = `${font_family}, ui-sans-serif, system-ui, sans-serif`;

      console.log('✅ Font family applied:', font_family);
    }

    // Apply manual text color override
    if (text_color) {
      const textHSL = hexToHSL(text_color);
      if (textHSL) {
        // Set foreground color (main text color)
        const textColorHSL = `${textHSL.h} ${textHSL.s}% ${textHSL.l}%`;
        root.style.setProperty('--foreground', textColorHSL);
        root.style.setProperty('--card-foreground', textColorHSL);
        root.style.setProperty('--popover-foreground', textColorHSL);

        // Override automatic heading/body colors
        root.style.setProperty('--heading-color', textColorHSL);
        root.style.setProperty('--body-color', textColorHSL);

        console.log('✅ Manual text color applied:', text_color, '→', textColorHSL);
      }
    }

    // Apply custom CSS
    if (custom_css) {
      let styleElement = document.getElementById('custom-branding-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'custom-branding-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = custom_css;
      console.log('✅ Custom CSS applied');
    }

    console.log('🎨 Theme system initialized - Full color palettes generated!');
  }, [company?.branding]);

  return <>{children}</>;
}
