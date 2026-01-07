'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Users, ArrowLeft } from 'lucide-react';
import { decryptQRToken } from '@/lib/qr/qr-encryptor';

// Dynamically import QR Scanner to reduce initial bundle size
const QRScannerComponent = dynamic(
  () => import('@/components/qr/qr-scanner-component').then(mod => ({ default: mod.QRScannerComponent })),
  {
    loading: () => <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg animate-pulse"><span className="text-sm text-muted-foreground">Loading scanner...</span></div>,
    ssr: false
  }
);

interface CheckInResult {
  success: boolean;
  guest?: {
    id: string;
    name: string;
    numberOfPacks: number;
  };
  error?: string;
  alreadyCheckedIn?: boolean;
  isTestMode?: boolean;
}

/**
 * Check-in Station Page
 * Dedicated page for scanning QR codes and checking in guests
 * NOTE: Public page - uses public API routes
 */
export default function CheckInPage() {
  const router = useRouter();
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScanSuccess = async (token: string, fullText: string) => {
    console.log('🎯 handleScanSuccess called with token:', token);
    setIsProcessing(true);
    setCheckInResult(null);

    try {
      // Decrypt and validate the token
      console.log('Decrypting token...');
      const decryptedToken = decryptQRToken(token);
      console.log('Decrypted token:', decryptedToken);

      if (!decryptedToken) {
        console.error('❌ Token decryption failed');
        setCheckInResult({
          success: false,
          error: 'Invalid or expired QR code',
        });
        setIsProcessing(false);
        return;
      }

      // Check if this is a test token
      const isTestToken = decryptedToken.guestId?.startsWith('test-');
      console.log('Is test token?', isTestToken);

      if (isTestToken) {
        console.log('✅ Test token detected - showing success');
        // Handle test token - show success with test data
        setCheckInResult({
          success: true,
          isTestMode: true,
          guest: {
            id: decryptedToken.guestId,
            name: 'Test Guest (Demo)',
            numberOfPacks: 2,
          },
        });
        playSuccessSound();
        setIsProcessing(false);
        return;
      }

      // Get location if available
      let location: { lat: number; lng: number } | undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false,
            });
          });

          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (error) {
          console.warn('Failed to get location:', error);
        }
      }

      // First, get the guest to check if already checked in
      const guestResponse = await fetch(`/api/public/guest?guestId=${decryptedToken.guestId}`);
      const guestResult = await guestResponse.json();

      if (!guestResponse.ok || !guestResult.data) {
        console.error('❌ Failed to fetch guest:', guestResult.error);
        setCheckInResult({
          success: false,
          error: 'Guest not found',
        });
        setIsProcessing(false);
        return;
      }

      const guest = guestResult.data;

      if (guest.checkedIn) {
        console.log('⚠️ Guest already checked in');
        setCheckInResult({
          success: false,
          error: 'This guest is already checked in',
          alreadyCheckedIn: true,
          guest: {
            id: guest.id,
            name: guest.name,
            numberOfPacks: guest.numberOfPacks,
          },
        });
        setIsProcessing(false);
        return;
      }

      // Check in the guest via public API
      const checkInResponse = await fetch('/api/public/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-in',
          guestId: decryptedToken.guestId,
          data: { location },
        }),
      });

      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok) {
        console.error('❌ Failed to check in guest:', checkInData.error);
        setCheckInResult({
          success: false,
          error: 'Failed to check in guest',
        });
        setIsProcessing(false);
        return;
      }

      // Success!
      setCheckInResult({
        success: true,
        guest: {
          id: checkInData.data.id,
          name: checkInData.data.name,
          numberOfPacks: checkInData.data.numberOfPacks,
        },
      });

      // Play success sound (optional)
      playSuccessSound();
    } catch (error) {
      console.error('Check-in error:', error);
      setCheckInResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check in guest',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
  };

  const handleScanAnother = () => {
    setCheckInResult(null);
  };

  const playSuccessSound = () => {
    // Optional: Play a success sound
    try {
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist
      });
    } catch (error) {
      // Ignore
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Guest Check-In Station</h1>
            <p className="text-muted-foreground mt-1">Scan guest QR codes to check them in</p>
          </div>
          <Users className="h-12 w-12 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-6">
        {/* Scanner */}
        <QRScannerComponent
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          title="Scan Guest QR Code"
          description="Position the QR code within the frame"
          autoStart={false}
          showFileUpload={true}
        />

        {/* Processing State */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Processing check-in...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check-In Result */}
        {checkInResult && !isProcessing && (
          <Card className={checkInResult.success ? 'border-green-500' : 'border-destructive'}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {checkInResult.success ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      {checkInResult.success ? 'Check-In Successful!' : 'Check-In Failed'}
                    </CardTitle>
                    {checkInResult.isTestMode && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        Test Mode
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {checkInResult.success
                      ? checkInResult.isTestMode
                        ? 'Demo check-in (not saved to database)'
                        : 'Guest has been checked in'
                      : checkInResult.alreadyCheckedIn
                        ? 'This guest is already checked in'
                        : 'Unable to check in guest'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkInResult.guest && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Guest Name:</span>
                    <span className="text-sm">{checkInResult.guest.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Party Size:</span>
                    <Badge>{checkInResult.guest.numberOfPacks} {checkInResult.guest.numberOfPacks === 1 ? 'person' : 'people'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Check-In Time:</span>
                    <span className="text-sm">{new Date().toLocaleString()}</span>
                  </div>
                </div>
              )}

              {checkInResult.error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{checkInResult.error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleScanAnother} className="w-full">
                Scan Next Guest
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click &quot;Start Scanning&quot; to activate the camera</li>
              <li>Position the guest&apos;s QR code within the camera frame</li>
              <li>The system will automatically scan and check in the guest</li>
              <li>You can also upload a QR code image using the &quot;Upload Image&quot; button</li>
              <li>After each check-in, scan the next guest&apos;s QR code</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
