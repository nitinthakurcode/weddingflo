'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { Guest } from '@/types/guest';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface QRCodeGeneratorProps {
  guest: Guest;
  onGenerated: () => void;
}

export function QRCodeGenerator({ guest, onGenerated }: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const generateQR = useMutation({
    mutationFn: async (guestId: string) => {
      const qrToken = uuidv4();
      const { data, error } = await supabase
        .from('guests')
        .update({ qr_token: qrToken })
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateQR.mutateAsync(guest.id);
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
