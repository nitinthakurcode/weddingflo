'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from '@/lib/navigation';
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

/**
 * Guest Form Schema - Fields 1-11 that guests can fill via QR/form link
 * 1. Guest Name, 2. Phone, 3. Email, 4. Party Size, 5. Additional Guests
 * 6. Arrival Date/Time, 7. Arrival Mode, 8. Departure Date/Time, 9. Departure Mode
 * 10. Relationship to Family, 11. Events Attending
 */
const guestFormSchema = z.object({
  // 1. Guest Name
  name: z.string().min(1, 'Name is required'),
  // 2. Phone Number
  phone: z.string().optional(),
  // 3. Email
  email: z.string().email().optional().or(z.literal('')),
  // 4. Party Size (Number of Packs)
  partySize: z.number().min(1).optional().default(1),
  // 5. Additional Guest Names
  additionalGuestNames: z.string().optional(),
  // 6. Arrival Date and Time
  arrivalDatetime: z.string().optional(),
  // 7. Mode of Arrival
  arrivalMode: z.string().optional(),
  // 8. Departure Date and Time
  departureDatetime: z.string().optional(),
  // 9. Mode of Departure
  departureMode: z.string().optional(),
  // 10. Relationship to Family
  relationshipToFamily: z.string().optional(),
  // 11. Events Attending (comma-separated or selected from list)
  attendingEvents: z.string().optional(),
  // Bonus: Dietary restrictions
  dietaryRestrictions: z.string().optional(),
  // Meal Preference
  mealPreference: z.enum(['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'other']).optional().default('standard'),
  // RSVP Status
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).optional().default('confirmed'),
});

type GuestFormData = z.input<typeof guestFormSchema>;

/**
 * QR Landing Page
 * Guest-facing page for RSVP, check-in, or viewing information
 * NOTE: This is a public page - uses public API routes
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
      if (!isTest && decryptedToken.guestId) {
        try {
          // Record QR scan via public API
          await fetch('/api/public/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'record-scan',
              guestId: decryptedToken.guestId,
              data: { scanType: decryptedToken.type || 'check-in' },
            }),
          });
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
      if (!tokenData?.guestId || isTestMode) {
        // Test mode - simulate success without saving
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSubmitSuccess(true);
        setIsSubmitting(false);
        return;
      }

      // Update guest information via public API - All 11 fields
      const response = await fetch('/api/public/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-info',
          guestId: tokenData.guestId,
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            partySize: data.partySize,
            additionalGuestNames: data.additionalGuestNames,
            arrivalDatetime: data.arrivalDatetime,
            arrivalMode: data.arrivalMode,
            departureDatetime: data.departureDatetime,
            departureMode: data.departureMode,
            relationshipToFamily: data.relationshipToFamily,
            attendingEvents: data.attendingEvents,
            dietaryRestrictions: data.dietaryRestrictions,
            mealPreference: data.mealPreference,
            rsvpStatus: data.rsvpStatus,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-pink-50 p-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-pink-50 p-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-pink-50 p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-pink-50 p-4 py-12">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">Welcome to the Wedding</CardTitle>
              <CardDescription>
                {tokenData?.type === 'check-in' && 'Please check in below'}
                {tokenData?.type === 'rsvp' && 'Please confirm your attendance'}
                {tokenData?.type === 'guest-form' && 'Please fill out your details'}
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

            {/* Guest Form - All 11 Fields for Guest Self-Entry */}
            {(tokenData?.type === 'rsvp' || tokenData?.type === 'guest-form') && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Personal Information</h3>

                  {/* 1. Guest Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Full Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter your full name"
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <span className="text-sm text-destructive">{errors.name.message}</span>}
                  </div>

                  {/* 2. Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="e.g., +1 234 567 8900"
                      type="tel"
                    />
                  </div>

                  {/* 3. Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      {...register('email')}
                      placeholder="your@email.com"
                      type="email"
                    />
                  </div>

                  {/* 10. Relationship to Family */}
                  <div className="space-y-2">
                    <Label htmlFor="relationshipToFamily">Relationship to Family</Label>
                    <Input
                      id="relationshipToFamily"
                      {...register('relationshipToFamily')}
                      placeholder="e.g., Friend of bride, Uncle, Colleague, etc."
                    />
                  </div>
                </div>

                {/* Section 2: Party Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Party Details</h3>

                  {/* 4. Party Size (Number of Packs) */}
                  <div className="space-y-2">
                    <Label htmlFor="partySize">Number of Guests (including yourself)</Label>
                    <Input
                      id="partySize"
                      {...register('partySize', { valueAsNumber: true })}
                      type="number"
                      min={1}
                      defaultValue={1}
                    />
                  </div>

                  {/* 5. Additional Guest Names */}
                  <div className="space-y-2">
                    <Label htmlFor="additionalGuestNames">Additional Guest Names</Label>
                    <Input
                      id="additionalGuestNames"
                      {...register('additionalGuestNames')}
                      placeholder="Names of additional guests (comma separated)"
                    />
                    <span className="text-xs text-muted-foreground">e.g., John Doe, Jane Doe</span>
                  </div>
                </div>

                {/* Section 3: Travel Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Travel Details</h3>

                  {/* 6. Arrival Date and Time */}
                  <div className="space-y-2">
                    <Label htmlFor="arrivalDatetime">Arrival Date & Time</Label>
                    <Input
                      id="arrivalDatetime"
                      {...register('arrivalDatetime')}
                      type="datetime-local"
                    />
                  </div>

                  {/* 7. Mode of Arrival */}
                  <div className="space-y-2">
                    <Label htmlFor="arrivalMode">Mode of Arrival</Label>
                    <Input
                      id="arrivalMode"
                      {...register('arrivalMode')}
                      placeholder="e.g., Flight, Car, Train, etc."
                    />
                  </div>

                  {/* 8. Departure Date and Time */}
                  <div className="space-y-2">
                    <Label htmlFor="departureDatetime">Departure Date & Time</Label>
                    <Input
                      id="departureDatetime"
                      {...register('departureDatetime')}
                      type="datetime-local"
                    />
                  </div>

                  {/* 9. Mode of Departure */}
                  <div className="space-y-2">
                    <Label htmlFor="departureMode">Mode of Departure</Label>
                    <Input
                      id="departureMode"
                      {...register('departureMode')}
                      placeholder="e.g., Flight, Car, Train, etc."
                    />
                  </div>
                </div>

                {/* Section 4: Event & Preferences */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Event Preferences</h3>

                  {/* 11. Events Attending */}
                  <div className="space-y-2">
                    <Label htmlFor="attendingEvents">Events You Will Attend</Label>
                    <Input
                      id="attendingEvents"
                      {...register('attendingEvents')}
                      placeholder="e.g., Mehendi, Sangeet, Wedding, Reception"
                    />
                    <span className="text-xs text-muted-foreground">Enter event names separated by commas</span>
                  </div>

                  {/* Meal Preference */}
                  <div className="space-y-2">
                    <Label htmlFor="mealPreference">Meal Preference</Label>
                    <select
                      id="mealPreference"
                      {...register('mealPreference')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="standard">Standard</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="kosher">Kosher</option>
                      <option value="halal">Halal</option>
                      <option value="gluten_free">Gluten Free</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Dietary Restrictions / Allergies */}
                  <div className="space-y-2">
                    <Label htmlFor="dietaryRestrictions">Dietary Restrictions / Allergies</Label>
                    <Input
                      id="dietaryRestrictions"
                      {...register('dietaryRestrictions')}
                      placeholder="e.g., Nut allergy, Lactose intolerant"
                    />
                    <span className="text-xs text-muted-foreground">Please specify any allergies or special requirements</span>
                  </div>
                </div>

                {/* RSVP Confirmation */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <Label>Confirm Your Attendance</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="confirmed"
                        {...register('rsvpStatus')}
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes, I&apos;ll attend</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="declined"
                        {...register('rsvpStatus')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Sorry, can&apos;t make it</span>
                    </label>
                  </div>
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

            {/* Guest form type is handled above with rsvp */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
