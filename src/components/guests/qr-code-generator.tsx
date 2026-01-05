'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { Guest } from '@/types/guest';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

interface QRCodeGeneratorProps {
  guest: Guest;
  onGenerated: () => void;
}

export function QRCodeGenerator({ guest, onGenerated }: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const utils = trpc.useUtils();

  const generateQR = trpc.qr.generateForGuest.useMutation({
    onSuccess: () => {
      utils.guests.getAll.invalidate();
    },
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateQR.mutateAsync({ guestId: guest.id });
      toast({
        title: 'Success',
        description: 'QR code generated successfully',
      });
      onGenerated();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      variant="outline"
      size="sm"
    >
      <QrCode className="mr-2 h-4 w-4" />
      {isGenerating ? 'Generating...' : 'Generate QR Code'}
    </Button>
  );
}
