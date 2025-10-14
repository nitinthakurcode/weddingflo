'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { Guest } from '@/types/guest';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  guest: Guest;
  onGenerated: () => void;
}

export function QRCodeGenerator({ guest, onGenerated }: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const generateQR = useMutation(api.guests.generateQRCode);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateQR({ guestId: guest._id });
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
