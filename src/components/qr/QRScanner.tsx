'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Camera } from 'lucide-react'

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const verifyCheckin = trpc.qr.verifyCheckin.useMutation()

  const startScanner = async () => {
    try {
      setResult(null)
      setIsScanning(true)

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // QR code scanned successfully
          await html5QrCode.stop()
          setIsScanning(false)

          // Verify check-in
          try {
            const response = await verifyCheckin.mutateAsync({ qrData: decodedText })
            setResult({
              success: true,
              message: response.message,
            })
          } catch (error: any) {
            setResult({
              success: false,
              message: error.message || 'Invalid QR code',
            })
          }
        },
        (errorMessage) => {
          // Scanning errors (can be ignored)
        }
      )
    } catch (error) {
      console.error('Camera error:', error)
      setResult({
        success: false,
        message: 'Failed to access camera. Please allow camera permissions.',
      })
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Guest Check-In Scanner
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scanner View */}
        {!isScanning && !result && (
          <Button onClick={startScanner} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Scanning
          </Button>
        )}

        {isScanning && (
          <div>
            <div id="qr-reader" className="w-full"></div>
            <Button
              onClick={stopScanner}
              variant="outline"
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'} className="mb-4">
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {!isScanning && result && (
          <Button onClick={startScanner} className="w-full mt-4">
            Scan Next Guest
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
