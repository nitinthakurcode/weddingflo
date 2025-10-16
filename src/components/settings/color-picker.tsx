'use client';

import { Label } from '@/components/ui/label';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          id={label.toLowerCase().replace(/\s+/g, '-')}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 cursor-pointer rounded-md border border-input bg-background"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
          <div
            className="h-10 w-10 rounded-md border border-input"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    </div>
  );
}
