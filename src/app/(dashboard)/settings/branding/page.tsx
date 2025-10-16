'use client';

import { BrandingForm } from '@/components/settings/branding-form';

export default function BrandingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
        <p className="text-muted-foreground">
          Customize your brand appearance and colors
        </p>
      </div>

      <BrandingForm />
    </div>
  );
}
