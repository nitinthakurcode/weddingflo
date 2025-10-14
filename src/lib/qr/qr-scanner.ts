/**
 * QR Code Scanner utilities
 * Wrapper around html5-qrcode for scanning QR codes
 */

import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeResult } from 'html5-qrcode';

export interface QRScannerConfig {
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  videoConstraints?: MediaTrackConstraints;
}

export interface QRScanResult {
  decodedText: string;
  result: Html5QrcodeResult;
}

export type QRScanSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => void;
export type QRScanErrorCallback = (errorMessage: string) => void;

/**
 * QR Scanner class for managing html5-qrcode instance
 */
export class QRScanner {
  private scanner: Html5Qrcode | null = null;
  private elementId: string;
  private isScanning: boolean = false;

  constructor(elementId: string) {
    this.elementId = elementId;
  }

  /**
   * Initialize the scanner
   */
  async initialize(): Promise<void> {
    if (this.scanner) {
      return;
    }

    try {
      this.scanner = new Html5Qrcode(this.elementId);
    } catch (error) {
      console.error('Failed to initialize QR scanner:', error);
      throw error;
    }
  }

  /**
   * Start scanning with camera
   */
  async startScanning(
    onSuccess: QRScanSuccessCallback,
    onError?: QRScanErrorCallback,
    config?: QRScannerConfig
  ): Promise<void> {
    if (!this.scanner) {
      await this.initialize();
    }

    if (this.isScanning) {
      console.warn('Scanner is already running');
      return;
    }

    const defaultConfig: QRScannerConfig = {
      fps: 10, // Reduced to give scanner more time per frame
      qrbox: 300, // Larger box for easier targeting
      aspectRatio: 1.0,
      disableFlip: false, // Try both orientations
      videoConstraints: {
        facingMode: 'user', // Use front camera (better for desktop scanning)
        focusMode: 'continuous',
      } as MediaTrackConstraints,
    };

    const scannerConfig = { ...defaultConfig, ...config };

    try {
      console.log('Scanner config:', scannerConfig);

      // Try to start with front camera first (better for desktop/webcam)
      // If it fails, fall back to back camera (for mobile)
      try {
        console.log('Attempting to start with front camera (webcam)...');
        await this.scanner!.start(
          { facingMode: 'user' }, // Use front camera (webcam)
          {
            fps: scannerConfig.fps!,
            qrbox: scannerConfig.qrbox!,
            aspectRatio: scannerConfig.aspectRatio!,
            disableFlip: scannerConfig.disableFlip!,
          },
          onSuccess,
          onError
        );
        console.log('✅ Front camera (webcam) started successfully');
      } catch (frontCameraError) {
        console.warn('❌ Front camera not available, trying back camera:', frontCameraError);
        // Fall back to back camera (for mobile devices)
        await this.scanner!.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: scannerConfig.fps!,
            qrbox: scannerConfig.qrbox!,
            aspectRatio: scannerConfig.aspectRatio!,
            disableFlip: scannerConfig.disableFlip!,
          },
          onSuccess,
          onError
        );
        console.log('✅ Back camera started successfully');
      }

      this.isScanning = true;
      console.log('Scanner is now running');
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      throw error;
    }
  }

  /**
   * Stop scanning
   */
  async stopScanning(): Promise<void> {
    if (!this.scanner || !this.isScanning) {
      return;
    }

    try {
      await this.scanner.stop();
      this.isScanning = false;
    } catch (error) {
      console.error('Failed to stop QR scanner:', error);
      throw error;
    }
  }

  /**
   * Scan from file/image
   */
  async scanFile(file: File): Promise<string> {
    if (!this.scanner) {
      await this.initialize();
    }

    try {
      const result = await this.scanner!.scanFile(file, true);
      return result;
    } catch (error) {
      console.error('Failed to scan file:', error);
      throw error;
    }
  }

  /**
   * Clear the scanner and release resources
   */
  async clear(): Promise<void> {
    if (this.scanner) {
      if (this.isScanning) {
        await this.stopScanning();
      }
      await this.scanner.clear();
      this.scanner = null;
    }
  }

  /**
   * Get scanner state
   */
  getState(): Html5QrcodeScannerState | null {
    return this.scanner?.getState() || null;
  }

  /**
   * Check if scanner is running
   */
  isRunning(): boolean {
    return this.isScanning;
  }

  /**
   * Get available cameras
   */
  static async getCameras(): Promise<Array<{ id: string; label: string }>> {
    try {
      const devices = await Html5Qrcode.getCameras();
      return devices.map((device) => ({
        id: device.id,
        label: device.label,
      }));
    } catch (error) {
      console.error('Failed to get cameras:', error);
      return [];
    }
  }

  /**
   * Request camera permissions
   */
  static async requestCameraPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately, we just needed to check permissions
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  /**
   * Check if camera is supported
   */
  static isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

/**
 * Parse QR code URL to extract token
 */
export function parseQRScanResult(decodedText: string): {
  isValid: boolean;
  token?: string;
  url?: string;
  type?: 'url' | 'token';
} {
  try {
    // Check if it's a URL
    if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      const tokenIndex = pathParts.indexOf('qr') + 1;

      if (tokenIndex > 0 && tokenIndex < pathParts.length) {
        return {
          isValid: true,
          token: pathParts[tokenIndex],
          url: decodedText,
          type: 'url',
        };
      }
    }

    // Assume it's a direct token
    if (decodedText && decodedText.length > 0) {
      return {
        isValid: true,
        token: decodedText,
        type: 'token',
      };
    }

    return { isValid: false };
  } catch (error) {
    console.error('Failed to parse QR scan result:', error);
    return { isValid: false };
  }
}

/**
 * Create a simple scanner for one-time use
 */
export async function scanQRCodeOnce(
  elementId: string,
  config?: QRScannerConfig
): Promise<string> {
  const scanner = new QRScanner(elementId);
  await scanner.initialize();

  return new Promise((resolve, reject) => {
    let resolved = false;

    const onSuccess: QRScanSuccessCallback = async (decodedText) => {
      if (resolved) return;
      resolved = true;

      try {
        await scanner.stopScanning();
        await scanner.clear();
        resolve(decodedText);
      } catch (error) {
        reject(error);
      }
    };

    const onError: QRScanErrorCallback = (errorMessage) => {
      // Ignore scanning errors, they're frequent
      console.debug('QR scan error:', errorMessage);
    };

    scanner.startScanning(onSuccess, onError, config).catch(reject);
  });
}
