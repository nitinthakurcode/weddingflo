'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Camera, XCircle } from 'lucide-react';

interface CheckInScannerProps {
  clientId: string;
  userId: string;
}

export function CheckInScanner({ clientId, userId }: CheckInScannerProps) {
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const { data: getGuestByQR } = useQuery({
    queryKey: ['guest-qr', lastScanned],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('qr_token', lastScanned)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lastScanned,
  });

  const checkIn = useMutation({
    mutationFn: async ({ guestId, checked_in_by }: any) => {
      const { data, error } = await supabase
        .from('guests')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by,
        })
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['guest-qr'] });
    },
  });

  useEffect(() => {
    if (!isScanning) return;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
    };

    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false
    );

    const onScanSuccess = async (decodedText: string) => {
      setLastScanned(decodedText);

      try {
        // Stop scanning temporarily
        await scannerRef.current?.pause(true);

        // Check in the guest
        await checkIn.mutateAsync({
          guestId: decodedText,
          checked_in_by: userId,
        });

        toast({
          title: 'Check-in Successful',
          description: 'Guest has been checked in',
        });

        // Resume scanning after a delay
        setTimeout(() => {
          scannerRef.current?.resume();
        }, 2000);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to check in guest',
          variant: 'destructive',
        });
        scannerRef.current?.resume();
      }
    };

    const onScanError = (error: string) => {
      // Ignore common scanning errors
      if (error.includes('NotFoundException')) return;
      console.error('QR Scan Error:', error);
    };

    scannerRef.current.render(onScanSuccess, onScanError);

    return () => {
      scannerRef.current?.clear().catch(console.error);
    };
  }, [isScanning, checkIn, userId, toast]);

  const handleStartScanning = () => {
    setIsScanning(true);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    scannerRef.current?.clear().catch(console.error);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>
            Scan guest QR codes to check them in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isScanning ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <Button onClick={handleStartScanning} size="lg">
                <Camera className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="w-full"></div>
              <Button
                onClick={handleStopScanning}
                variant="outline"
                className="w-full"
              >
                Stop Scanning
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {lastScanned && getGuestByQR && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getGuestByQR.checked_in ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Checked In
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  Pending
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Guest Name</p>
                <p className="font-medium">{getGuestByQR.guest_name}</p>
              </div>
              {getGuestByQR.number_of_packs > 1 && getGuestByQR.additional_guest_names.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Additional Guests</p>
                  <p className="font-medium">{getGuestByQR.additional_guest_names.join(', ')}</p>
                </div>
              )}
              {getGuestByQR.dietary_restrictions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Dietary Restrictions</p>
                  <p className="font-medium">{getGuestByQR.dietary_restrictions.join(', ')}</p>
                </div>
              )}
              {getGuestByQR.checked_in_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Checked In At</p>
                  <p className="font-medium">
                    {new Date(getGuestByQR.checked_in_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
