'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Camera, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface CheckInScannerProps {
  clientId: string;
  userId: string;
}

interface CheckInResult {
  success: boolean;
  guestName: string;
  message: string;
}

export function CheckInScanner({ clientId, userId }: CheckInScannerProps) {
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState<CheckInResult | null>(null);
  const utils = trpc.useUtils();

  // Use the verifyCheckin mutation which does both verification and check-in
  const verifyCheckin = trpc.qr.verifyCheckin.useMutation({
    onSuccess: (data) => {
      setLastCheckedIn(data);
      utils.guests.getAll.invalidate({ clientId });
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
      try {
        // Stop scanning temporarily
        await scannerRef.current?.pause(true);

        // Verify and check in the guest using the QR data
        await verifyCheckin.mutateAsync({
          qrData: decodedText,
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
  }, [isScanning, verifyCheckin, clientId, toast]);

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

          {verifyCheckin.isPending && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Checking in guest...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {lastCheckedIn && (
        <Card className="border-sage-200 bg-sage-50 dark:border-sage-800 dark:bg-sage-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sage-700 dark:text-sage-300">
              <CheckCircle className="h-5 w-5" />
              Check-in Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Guest Name</p>
                <p className="font-medium text-lg">{lastCheckedIn.guestName}</p>
              </div>
              <p className="text-sm text-sage-600 dark:text-sage-400">{lastCheckedIn.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
