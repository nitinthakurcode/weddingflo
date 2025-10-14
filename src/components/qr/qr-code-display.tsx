'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate: boolean;
  };
  title?: string;
  description?: string;
  showDownload?: boolean;
  onDownload?: () => void;
  className?: string;
}

/**
 * Display a single QR code with optional branding and download button
 */
export function QRCodeDisplay({
  value,
  size = 256,
  level = 'H',
  includeMargin = true,
  imageSettings,
  title,
  description,
  showDownload = true,
  onDownload,
  className = '',
}: QRCodeDisplayProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default download behavior
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-code-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4">
          {title && (
            <h3 className="text-lg font-semibold text-center">{title}</h3>
          )}

          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="qr-code-svg"
              value={value}
              size={size}
              level={level}
              includeMargin={includeMargin}
              imageSettings={imageSettings}
            />
          </div>

          {description && (
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {description}
            </p>
          )}

          {showDownload && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * QR Code with regenerate option
 */
export function RegenerableQRCode({
  value,
  onRegenerate,
  ...props
}: QRCodeDisplayProps & { onRegenerate?: () => void }) {
  return (
    <div className="space-y-2">
      <QRCodeDisplay value={value} {...props} />
      {onRegenerate && (
        <Button
          onClick={onRegenerate}
          variant="ghost"
          className="w-full"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate QR Code
        </Button>
      )}
    </div>
  );
}
