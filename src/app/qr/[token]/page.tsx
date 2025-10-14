'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { decryptQRToken } from '@/lib/qr/qr-encryptor';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface PageProps {
  params: Promise<{ token: string }>;
}

const guestFormSchema = z.object({
  dietaryRestrictions: z.string().optional(),
  specialNeeds: z.string().optional(),
  modeOfArrival: z.string().optional(),
  modeOfDeparture: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

/**
 * QR Landing Page
 * Guest-facing page for RSVP, check-in, or viewing information
 */
export default function QRLandingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { token } = resolvedParams;
  const router = useRouter();

  const [isValidating, setIsValidating] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const recordScanMutation = useMutation(api.qr.recordQRScan);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setIsValidating(true);
    setError(null);

    try {
      // Decrypt the token
      const decryptedToken = decryptQRToken(token);

      if (!decryptedToken) {
        setError('This QR code is invalid or has expired.');
        setIsValidating(false);
        return;
      }

      setTokenData(decryptedToken);

      // Check if this is a test token (guest ID starts with "test-")
      const isTest = decryptedToken.guestId?.startsWith('test-');
      setIsTestMode(isTest);

      // Only record the scan for real guests, not test tokens
      if (!isTest) {
        try {
          await recordScanMutation({ token });
        } catch (scanError) {
          console.error('Failed to record scan:', scanError);
          // Don't show error to user, this is not critical
        }
      }

      setIsValidating(false);
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate QR code. Please try again.');
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: GuestFormData) => {
    setIsSubmitting(true);

    try {
      // Here you would call a Convex mutation to update guest information
      // For now, we'll just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating QR code...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle>Invalid QR Code</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This QR code may have expired or is not valid. Please contact the event organizer for assistance.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Thank You!</CardTitle>
                <CardDescription>Your information has been submitted successfully</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We look forward to seeing you at the event!
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 py-12">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">Welcome to the Wedding</CardTitle>
              <CardDescription>
                {tokenData?.type === 'check-in' && 'Please check in below'}
                {tokenData?.type === 'rsvp' && 'Please confirm your attendance'}
                {tokenData?.type === 'gift-registry' && 'View our gift registry'}
              </CardDescription>
              {isTestMode && (
                <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                  Test Mode - Demo QR Code
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Mode Notice */}
            {isTestMode && (
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-700" />
                <AlertTitle className="text-yellow-900">Test Mode Active</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  This is a demo QR code for testing purposes. No data will be saved to the database.
                </AlertDescription>
              </Alert>
            )}

            {/* Guest Information */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Guest ID:</span>
                <Badge variant="outline">{tokenData?.guestId?.substring(0, 8)}...</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Event Type:</span>
                <Badge>{tokenData?.type || 'check-in'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valid Until:</span>
                <span className="text-sm">
                  {tokenData?.expiresAt ? new Date(tokenData.expiresAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Guest Form */}
            {tokenData?.type === 'rsvp' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions (Optional)</Label>
                  <Input
                    id="dietaryRestrictions"
                    {...register('dietaryRestrictions')}
                    placeholder="e.g., Vegetarian, Gluten-free, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialNeeds">Special Needs (Optional)</Label>
                  <Input
                    id="specialNeeds"
                    {...register('specialNeeds')}
                    placeholder="e.g., Wheelchair access, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modeOfArrival">Mode of Arrival (Optional)</Label>
                  <Input
                    id="modeOfArrival"
                    {...register('modeOfArrival')}
                    placeholder="e.g., Car, Flight, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modeOfDeparture">Mode of Departure (Optional)</Label>
                  <Input
                    id="modeOfDeparture"
                    {...register('modeOfDeparture')}
                    placeholder="e.g., Car, Flight, etc."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit RSVP'
                  )}
                </Button>
              </form>
            )}

            {tokenData?.type === 'check-in' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Check-In Instructions</AlertTitle>
                <AlertDescription>
                  Please proceed to the check-in station and show this QR code to the staff for check-in.
                </AlertDescription>
              </Alert>
            )}

            {tokenData?.type === 'gift-registry' && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Thank you for wanting to celebrate with us! Our gift registry will be available soon.
                </p>
                <Button variant="outline" className="w-full">
                  View Gift Registry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
