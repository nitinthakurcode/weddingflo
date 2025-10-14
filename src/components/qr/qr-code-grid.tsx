'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DownloadCloud } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface QRCodeGridItem {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface QRCodeGridProps {
  items: QRCodeGridItem[];
  size?: number;
  columns?: number;
  showLabels?: boolean;
  showDownloadAll?: boolean;
  onDownloadItem?: (item: QRCodeGridItem) => void;
  className?: string;
}

/**
 * Display multiple QR codes in a grid layout
 */
export function QRCodeGrid({
  items,
  size = 150,
  columns = 3,
  showLabels = true,
  showDownloadAll = true,
  onDownloadItem,
  className = '',
}: QRCodeGridProps) {
  const handleDownloadItem = async (item: QRCodeGridItem) => {
    if (onDownloadItem) {
      onDownloadItem(item);
      return;
    }

    const svg = document.getElementById(`qr-code-${item.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size * 2; // Higher resolution
    canvas.height = size * 2;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, size * 2, size * 2);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-code-${item.label.replace(/\s+/g, '-').toLowerCase()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();

    for (const item of items) {
      const svg = document.getElementById(`qr-code-${item.id}`);
      if (!svg) continue;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = size * 4; // High resolution
      canvas.height = size * 4;

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, size * 4, size * 4);
          canvas.toBlob((blob) => {
            if (blob) {
              zip.file(
                `qr-code-${item.label.replace(/\s+/g, '-').toLowerCase()}.png`,
                blob
              );
            }
            resolve();
          });
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `qr-codes-${Date.now()}.zip`);
  };

  return (
    <div className={className}>
      {showDownloadAll && items.length > 1 && (
        <div className="mb-6 flex justify-end">
          <Button onClick={handleDownloadAll} variant="outline">
            <DownloadCloud className="h-4 w-4 mr-2" />
            Download All ({items.length})
          </Button>
        </div>
      )}

      <div
        className={`grid gap-4`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    id={`qr-code-${item.id}`}
                    value={item.value}
                    size={size}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {showLabels && (
                  <div className="text-center space-y-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => handleDownloadItem(item)}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
