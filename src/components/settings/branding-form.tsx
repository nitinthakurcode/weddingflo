'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LogoUpload } from './logo-upload';
import { ColorPicker } from './color-picker';
import { Loader2, Palette, Save } from 'lucide-react';

interface BrandingFormData {
  logo_url?: string;
  app_icon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color?: string;
  font_family: string;
  custom_css?: string;
}

const DEFAULT_BRANDING: BrandingFormData = {
  primary_color: '#14B8A6', // Transformative Teal - 2026 Primary
  secondary_color: '#A38B73', // Mocha Mousse - 2025 Pantone COTY
  accent_color: '#D4A853', // Champagne Gold - Celebration
  text_color: '#3D322A', // Mocha 900 - Warm professional
  font_family: 'Plus Jakarta Sans, system-ui, sans-serif',
};

const FONT_OPTIONS = [
  'Plus Jakarta Sans, system-ui, sans-serif',
  'Cormorant Garamond, Georgia, serif',
  'DM Mono, SF Mono, monospace',
  'Inter, system-ui, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Montserrat, sans-serif',
  'Playfair Display, serif',
  'Merriweather, serif',
];

export function BrandingForm() {
  const { data: session } = useSession();
  const user = session?.user;
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const { data: company } = trpc.companies.getCurrent.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const [formData, setFormData] = useState<BrandingFormData>(DEFAULT_BRANDING);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when company data loads
  useEffect(() => {
    if (company?.branding) {
      // Cast branding to expected type (stored as JSON in DB)
      const branding = company.branding as BrandingFormData;
      setFormData({
        logo_url: branding.logo_url,
        app_icon_url: branding.app_icon_url,
        primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
        secondary_color: branding.secondary_color || DEFAULT_BRANDING.secondary_color,
        accent_color: branding.accent_color || DEFAULT_BRANDING.accent_color,
        text_color: branding.text_color || DEFAULT_BRANDING.text_color,
        font_family: branding.font_family || DEFAULT_BRANDING.font_family,
        custom_css: branding.custom_css,
      });
    }
  }, [company]);

  const updateBranding = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.getCurrent.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company?.id) {
      toast({
        title: 'Error',
        description: 'Company not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Company ID comes from session context - just pass branding data
      await updateBranding.mutateAsync({
        branding: formData as unknown as Record<string, unknown>,
      });

      toast({
        title: 'Branding updated',
        description: 'Your brand settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to update branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save branding. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo & Icons */}
      <Card>
        <CardHeader>
          <CardTitle>Logo & Icons</CardTitle>
          <CardDescription>
            Upload your company logo and app icon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload
            label="Company Logo"
            description="JPG, PNG or SVG. Max 5MB. Recommended: 400x400px"
            currentLogoUrl={formData.logo_url}
            onUploadComplete={(url) => setFormData({ ...formData, logo_url: url })}
            onRemove={() => setFormData({ ...formData, logo_url: undefined })}
          />

          <Separator />

          <LogoUpload
            label="App Icon"
            description="JPG, PNG or SVG. Max 5MB. Recommended: 512x512px"
            currentLogoUrl={formData.app_icon_url}
            onUploadComplete={(url) => setFormData({ ...formData, app_icon_url: url })}
            onRemove={() => setFormData({ ...formData, app_icon_url: undefined })}
          />
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Customize your brand color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorPicker
            label="Primary Color"
            description="Main brand color used for buttons and highlights"
            value={formData.primary_color}
            onChange={(color) => setFormData({ ...formData, primary_color: color })}
          />

          <ColorPicker
            label="Secondary Color"
            description="Secondary brand color for accents and variations"
            value={formData.secondary_color}
            onChange={(color) => setFormData({ ...formData, secondary_color: color })}
          />

          <ColorPicker
            label="Accent Color"
            description="Accent color for special elements and CTAs"
            value={formData.accent_color}
            onChange={(color) => setFormData({ ...formData, accent_color: color })}
          />

          <Separator />

          <ColorPicker
            label="Text Color (Optional)"
            description="Manual override for all text colors. Leave default for automatic contrast"
            value={formData.text_color || DEFAULT_BRANDING.text_color || '#3D322A'}
            onChange={(color) => setFormData({ ...formData, text_color: color })}
          />

          {/* Live Preview */}
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <Label className="mb-3 block">Live Preview</Label>
            <div className="space-y-3">
              {/* Preview buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  style={{ backgroundColor: formData.primary_color, color: '#fff' }}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  style={{ backgroundColor: formData.secondary_color, color: '#fff' }}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Secondary Button
                </button>
                <button
                  type="button"
                  style={{ backgroundColor: formData.accent_color, color: '#fff' }}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Accent Button
                </button>
              </div>

              {/* Preview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  style={{
                    backgroundColor: formData.primary_color + '15',
                    borderColor: formData.primary_color + '40',
                  }}
                  className="p-3 rounded-lg border-2"
                >
                  <p style={{ color: formData.primary_color }} className="text-sm font-semibold">
                    Primary
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Theme color</p>
                </div>
                <div
                  style={{
                    backgroundColor: formData.secondary_color + '15',
                    borderColor: formData.secondary_color + '40',
                  }}
                  className="p-3 rounded-lg border-2"
                >
                  <p
                    style={{ color: formData.secondary_color }}
                    className="text-sm font-semibold"
                  >
                    Secondary
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Theme color</p>
                </div>
                <div
                  style={{
                    backgroundColor: formData.accent_color + '15',
                    borderColor: formData.accent_color + '40',
                  }}
                  className="p-3 rounded-lg border-2"
                >
                  <p style={{ color: formData.accent_color }} className="text-sm font-semibold">
                    Accent
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Theme color</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Choose your brand font family
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <select
              id="font-family"
              value={formData.font_family}
              onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font.split(',')[0]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Preview: <span style={{ fontFamily: formData.font_family }}>The quick brown fox jumps over the lazy dog</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>
            Custom CSS for advanced styling (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="custom-css">Custom CSS</Label>
            <textarea
              id="custom-css"
              value={formData.custom_css || ''}
              onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
              placeholder=".custom-class { color: #000; }"
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Add custom CSS rules to further customize your brand appearance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (company?.branding) {
              // Cast branding to expected type (stored as JSON in DB)
              const branding = company.branding as BrandingFormData;
              setFormData({
                logo_url: branding.logo_url,
                app_icon_url: branding.app_icon_url,
                primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
                secondary_color: branding.secondary_color || DEFAULT_BRANDING.secondary_color,
                accent_color: branding.accent_color || DEFAULT_BRANDING.accent_color,
                text_color: branding.text_color || DEFAULT_BRANDING.text_color,
                font_family: branding.font_family || DEFAULT_BRANDING.font_family,
                custom_css: branding.custom_css,
              });
            }
          }}
          disabled={isSaving}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
