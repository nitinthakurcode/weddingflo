'use client';

import { useState } from 'react';
import { QRCodeDisplay } from '@/components/qr/qr-code-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateGuestQRCode } from '@/lib/qr/qr-generator';
import { generateGuestQRToken } from '@/lib/qr/qr-encryptor';

/**
 * QR Code Test Page
 * Generate and test QR codes with proper URLs
 */
export default function QRTestPage() {
  const [guestName, setGuestName] = useState('Test Guest');
  const [qrData, setQRData] = useState<any>(null);

  const handleGenerateQR = () => {
    // Generate a proper encrypted token
    const testGuestId = `test-guest-${Math.random().toString(36).substring(2, 10)}`;
    const testWeddingId = `test-wedding-${Math.random().toString(36).substring(2, 10)}`;

    // Use proper encryption
    const encryptedData = generateGuestQRToken(
      testGuestId,
      testWeddingId,
      'check-in',
      24 * 365 // Valid for 1 year
    );

    // Use the network IP so it works on mobile
    const baseUrl = typeof window !== 'undefined'
      ? `http://192.168.29.93:3000`
      : 'http://localhost:3000';

    // Create QR data with full URL
    const qrCodeData = {
      url: `${baseUrl}/qr/${encryptedData.token}`,
      token: encryptedData.token,
      guestName,
      guestId: testGuestId,
      weddingId: testWeddingId,
      expiresAt: encryptedData.expiresAt,
    };

    setQRData(qrCodeData);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Test Generator</CardTitle>
          <CardDescription>
            Generate a test QR code with proper URL for mobile scanning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter guest name"
              />
            </div>

            <Button onClick={handleGenerateQR} className="w-full">
              Generate Test QR Code
            </Button>
          </div>

          {/* QR Display */}
          {qrData && (
            <div className="space-y-4">
              <QRCodeDisplay
                value={qrData.url}
                title={`QR Code for ${qrData.guestName}`}
                description="Scan this with your phone camera or webcam"
                showDownload={true}
                size={500}
              />

              {/* URL Info */}
              <Card className="bg-muted">
                <CardContent className="pt-6 space-y-2">
                  <div>
                    <p className="text-sm font-medium">Full URL:</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {qrData.url}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Token:</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {qrData.token}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="border-blue-500 bg-blue-50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Testing Methods:</h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <strong className="text-green-600">✅ Recommended: Upload Method</strong>
                      <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                        <li>Click &quot;Download&quot; button above to save QR code</li>
                        <li>Go to Check-In page: <code className="bg-white px-1 rounded">/check-in</code></li>
                        <li>Click &quot;Upload Image&quot; and select the downloaded QR</li>
                        <li>Instant success!</li>
                      </ol>
                    </div>

                    <div>
                      <strong className="text-yellow-600">⚠️ Alternative: Phone Camera</strong>
                      <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                        <li>Make sure both devices on same WiFi</li>
                        <li>Open phone camera, scan QR code above</li>
                        <li>Tap notification to open: {qrData.url}</li>
                      </ol>
                    </div>

                    <div>
                      <strong className="text-orange-600">🎥 Experimental: Webcam Scan</strong>
                      <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                        <li>Open this QR code on your phone</li>
                        <li>Go to Check-In page on computer</li>
                        <li>Click &quot;Start Scanning&quot;</li>
                        <li>Hold phone 6-12 inches from webcam</li>
                        <li>Ensure good lighting, no glare</li>
                        <li>May take 5-10 seconds to detect</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Network Info */}
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Network Setup:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your computer: http://localhost:3000</li>
                <li>Your phone (same WiFi): http://192.168.29.93:3000</li>
                <li>Both devices must be on the same WiFi network</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
