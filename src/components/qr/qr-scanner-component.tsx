'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QRScanner, parseQRScanResult, type QRScanSuccessCallback } from '@/lib/qr/qr-scanner';

export interface QRScannerComponentProps {
  onScanSuccess: (token: string, fullText: string) => void;
  onScanError?: (error: string) => void;
  title?: string;
  description?: string;
  autoStart?: boolean;
  showFileUpload?: boolean;
  className?: string;
}

/**
 * QR Scanner Component with camera interface
 */
export function QRScannerComponent({
  onScanSuccess,
  onScanError,
  title = 'Scan QR Code',
  description = 'Position the QR code within the frame to scan',
  autoStart = false,
  showFileUpload = true,
  className = '',
}: QRScannerComponentProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [scanAttempts, setScanAttempts] = useState(0);

  const scannerRef = useRef<QRScanner | null>(null);
  const scannerElementId = 'qr-scanner-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<string | null>(null); // Use ref to avoid closure issues
  const processingRef = useRef<boolean>(false); // Prevent concurrent processing

  useEffect(() => {
    // Initialize scanner
    scannerRef.current = new QRScanner(scannerElementId);

    if (autoStart) {
      handleStartScanning();
    }

    // Cleanup on unmount
    return () => {
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleStartScanning = async () => {
    setError(null);
    setIsInitializing(true);
    console.log('Starting scanner...');

    try {
      // Check camera support
      if (!QRScanner.isCameraSupported()) {
        setError('Camera is not supported on this device');
        setIsInitializing(false);
        return;
      }

      console.log('Camera is supported');

      // Request permissions
      console.log('Requesting camera permissions...');
      const hasPermission = await QRScanner.requestCameraPermissions();
      if (!hasPermission) {
        setCameraPermission('denied');
        setError('Camera permission denied. Please allow camera access to scan QR codes.');
        setIsInitializing(false);
        return;
      }

      console.log('Camera permission granted');
      setCameraPermission('granted');

      // Show the scanner element before initializing
      setIsScanning(true);

      // Wait a bit for the element to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const onSuccess: QRScanSuccessCallback = (decodedText, result) => {
        console.log('✅ QR Code scanned successfully!');
        console.log('Decoded text:', decodedText);
        console.log('Result:', result);

        // Prevent concurrent processing
        if (processingRef.current) {
          console.log('⚠️ Already processing a scan, ignoring this one');
          return;
        }

        // Prevent duplicate scans using ref (avoids closure issues)
        if (lastScanRef.current === decodedText) {
          console.log('⚠️ Duplicate scan ignored (same as last scan)');
          return;
        }

        console.log('🔒 Setting processing lock');
        processingRef.current = true;
        lastScanRef.current = decodedText;
        setLastScan(decodedText);

        // Parse the result
        console.log('Parsing QR result...');
        const parsed = parseQRScanResult(decodedText);
        console.log('Parsed result:', parsed);

        if (parsed.isValid && parsed.token) {
          console.log('✅ Valid token found:', parsed.token);
          console.log('📞 About to call onScanSuccess callback...');
          console.log('Callback function exists?', !!onScanSuccess);
          console.log('Callback type:', typeof onScanSuccess);

          try {
            console.log('🚀 Calling onScanSuccess with token:', parsed.token.substring(0, 20) + '...');
            onScanSuccess(parsed.token, decodedText);
            console.log('✅ onScanSuccess callback completed successfully');
          } catch (error) {
            console.error('❌ Error calling onScanSuccess:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            setError('Failed to process scan result');
          } finally {
            // Release lock after a delay to prevent rapid re-scans
            setTimeout(() => {
              console.log('🔓 Releasing processing lock');
              processingRef.current = false;
            }, 2000);
          }
        } else {
          console.error('❌ Invalid QR code format');
          setError('Invalid QR code format');
          processingRef.current = false; // Release lock immediately on error
          if (onScanError) {
            onScanError('Invalid QR code format');
          }
        }
      };

      const onError = (errorMessage: string) => {
        // Increment scan attempts to show scanner is active
        setScanAttempts(prev => prev + 1);

        // Only log actual errors, not "QR code not found" messages
        if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
          console.warn('Scanner error:', errorMessage);
        }
      };

      console.log('Starting scanner with element:', scannerElementId);
      await scannerRef.current?.startScanning(onSuccess, onError, {
        fps: 10, // Reduced to give scanner more processing time per frame
        qrbox: 300, // Larger box for easier targeting
        aspectRatio: 1.0,
        disableFlip: false, // Try both orientations
      });

      console.log('Scanner started successfully');
      setIsInitializing(false);

      // Check if scanner element has video
      setTimeout(() => {
        const scannerElement = document.getElementById(scannerElementId);
        const video = scannerElement?.querySelector('video');
        console.log('Scanner element:', scannerElement);
        console.log('Video element found:', !!video);
        if (video) {
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          console.log('Video playing:', !video.paused);
        }
      }, 500);

      // Start heartbeat to show scanner is active
      heartbeatIntervalRef.current = setInterval(() => {
        console.log('💓 Scanner heartbeat - still running');
        setScanAttempts(prev => prev + 1);
      }, 1000); // Update every second
    } catch (err) {
      console.error('Failed to start scanner:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
      setError(errorMessage);
      setIsScanning(false);
      setIsInitializing(false);
      if (onScanError) {
        onScanError(errorMessage);
      }
    }
  };

  const handleStopScanning = async () => {
    try {
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      await scannerRef.current?.stopScanning();
      setIsScanning(false);
      setLastScan(null);
      setScanAttempts(0);
      lastScanRef.current = null; // Reset ref
      processingRef.current = false; // Reset processing lock
      console.log('Scanner stopped');
    } catch (err) {
      console.error('Failed to stop scanner:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const decodedText = await scannerRef.current?.scanFile(file);
      if (!decodedText) {
        throw new Error('No QR code found in image');
      }

      const parsed = parseQRScanResult(decodedText);

      if (parsed.isValid && parsed.token) {
        onScanSuccess(parsed.token, decodedText);
      } else {
        setError('Invalid QR code format');
        if (onScanError) {
          onScanError('Invalid QR code format');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan image';
      setError(errorMessage);
      if (onScanError) {
        onScanError(errorMessage);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {cameraPermission === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera access is required to scan QR codes. Please enable camera permissions in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <div
            id={scannerElementId}
            className={`w-full rounded-lg overflow-visible bg-black ${isScanning ? 'block' : 'hidden'}`}
            style={{
              minHeight: '400px',
              maxHeight: '600px',
              position: 'relative',
            }}
          />

          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
              <div className="text-center space-y-4 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            </div>
          )}

          {!isScanning && !isInitializing && (
            <div className="flex items-center justify-center bg-muted rounded-lg" style={{ minHeight: '400px' }}>
              <div className="text-center space-y-4">
                <CameraOff className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Camera is not active</p>
              </div>
            </div>
          )}
        </div>

        {isScanning && !isInitializing && (
          <div className="space-y-2">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Scanning Tips:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Position QR code 6-12 inches from camera</li>
                  <li>Ensure good lighting (no glare or shadows)</li>
                  <li>Hold steady for 2-3 seconds</li>
                  <li>If scanning fails, tilt screen slightly to reduce glare</li>
                  <li>Try uploading a screenshot instead if camera fails</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <span>Scanner active ({scanAttempts} scans attempted)</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={handleStartScanning} className="flex-1" disabled={isInitializing}>
              <Camera className="h-4 w-4 mr-2" />
              {isInitializing ? 'Initializing...' : 'Start Scanning'}
            </Button>
          ) : (
            <Button onClick={handleStopScanning} variant="destructive" className="flex-1" disabled={isInitializing}>
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}

          {showFileUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </>
          )}
        </div>

        {lastScan && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Last scan:</strong> {lastScan.substring(0, 50)}
              {lastScan.length > 50 ? '...' : ''}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact QR Scanner for inline use
 */
export function CompactQRScanner({
  onScanSuccess,
  className = '',
}: Pick<QRScannerComponentProps, 'onScanSuccess' | 'className'>) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<QRScanner | null>(null);
  const scannerElementId = 'compact-qr-scanner';

  useEffect(() => {
    scannerRef.current = new QRScanner(scannerElementId);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleToggleScanning = async () => {
    if (isScanning) {
      await scannerRef.current?.stopScanning();
      setIsScanning(false);
    } else {
      const onSuccess: QRScanSuccessCallback = (decodedText) => {
        const parsed = parseQRScanResult(decodedText);
        if (parsed.isValid && parsed.token) {
          onScanSuccess(parsed.token, decodedText);
        }
      };

      await scannerRef.current?.startScanning(onSuccess, undefined, {
        fps: 10,
        qrbox: 200,
      });
      setIsScanning(true);
    }
  };

  return (
    <div className={className}>
      <div id={scannerElementId} className={isScanning ? 'block' : 'hidden'} />
      <Button onClick={handleToggleScanning} size="sm" variant={isScanning ? 'destructive' : 'default'}>
        {isScanning ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
        {isScanning ? 'Stop' : 'Scan'}
      </Button>
    </div>
  );
}
