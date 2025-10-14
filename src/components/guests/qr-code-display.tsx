'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Guest } from '@/types/guest';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  guest: Guest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeDisplay({ guest, open, onOpenChange }: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!guest) return null;

  const qrValue = guest.qr_code_token || guest._id;

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      const svg = document.getElementById('guest-qr-code');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');

        const downloadLink = document.createElement('a');
        downloadLink.download = `${guest.guest_name.replace(/\s+/g, '_')}_QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();

        toast({
          title: 'Success',
          description: 'QR code downloaded successfully',
        });
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code - {guest.guest_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="guest-qr-code"
              value={qrValue}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">{guest.guest_name}</p>
            {guest.number_of_packs > 1 && guest.additional_guest_names.length > 0 && (
              <p className="text-xs">+{guest.number_of_packs - 1}: {guest.additional_guest_names.join(', ')}</p>
            )}
            <p className="text-xs mt-2">Scan this QR code for check-in</p>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Download QR Code'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
