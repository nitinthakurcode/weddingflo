'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, AlertCircle, Heart, Users, Calendar, Plane, Utensils, User, Copy } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface PageProps {
  params: Promise<{ clientId: string }>;
}

/**
 * Individual Guest Schema - includes travel details per guest
 */
const guestDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  attendingEvents: z.array(z.string()).default([]),
  dietaryRestrictions: z.string().optional(),
  // Per-guest travel details
  arrivalDatetime: z.string().optional(),
  arrivalMode: z.string().optional(),
  departureDatetime: z.string().optional(),
  departureMode: z.string().optional(),
});

/**
 * Guest Registration Form Schema - Dynamic multi-guest support
 * Note: Using z.input for form type to match react-hook-form expectations
 */
const guestFormSchema = z.object({
  // Primary guest info
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  relationshipToFamily: z.string().optional(),

  // Party size determines how many guest sections to show
  partySize: z.coerce.number().min(1).max(20).default(1),

  // Primary guest event preferences
  attendingEvents: z.array(z.string()).default([]),
  dietaryRestrictions: z.string().optional(),

  // Primary guest travel details
  arrivalDatetime: z.string().optional(),
  arrivalMode: z.string().optional(),
  departureDatetime: z.string().optional(),
  departureMode: z.string().optional(),

  // Additional guests (Guest 2, 3, etc.)
  additionalGuests: z.array(guestDataSchema).default([]),

  // RSVP Status
  rsvpStatus: z.enum(['pending', 'accepted', 'declined']).default('accepted'),
});

// Use z.input for form type to preserve optional/default handling
type GuestFormData = z.input<typeof guestFormSchema>;

interface EventInfo {
  id: string;
  title: string;
  eventDate: string | null;
  eventTime: string | null;
  venue: string | null;
}

interface ClientInfo {
  clientId: string;
  weddingName: string;
  weddingDate: string | null;
  events: EventInfo[];
}

/**
 * Event Checkboxes Component - Reusable for each guest
 */
function EventCheckboxes({
  events,
  selectedEvents,
  onChange,
  guestName,
}: {
  events: EventInfo[];
  selectedEvents: string[];
  onChange: (events: string[]) => void;
  guestName?: string;
}) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No specific events listed.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const isChecked = selectedEvents.includes(event.id);
        const formattedDate = event.eventDate
          ? new Date(event.eventDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })
          : null;

        return (
          <label
            key={event.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              isChecked
                ? 'border-pink-400 bg-pink-50'
                : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50/50'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                const newEvents = e.target.checked
                  ? [...selectedEvents, event.id]
                  : selectedEvents.filter(id => id !== event.id);
                onChange(newEvents);
              }}
              className="h-4 w-4 rounded border-gray-300 accent-pink-500"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{event.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {formattedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                    {event.eventTime && ` at ${event.eventTime}`}
                  </span>
                )}
                {event.venue && (
                  <span>• {event.venue}</span>
                )}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Public Guest Registration Page
 * Guests can self-register via a shareable form link
 * URL format: /en/guest-register/{clientId}
 */
export default function GuestRegisterPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { clientId } = resolvedParams;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      partySize: 1,
      rsvpStatus: 'accepted',
      attendingEvents: [],
      additionalGuests: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'additionalGuests',
  });

  // Watch values - ensure numeric types
  const partySize = Number(watch('partySize')) || 1;
  const primaryAttendingEvents = watch('attendingEvents') || [];

  // Sync additional guests array with party size
  useEffect(() => {
    const additionalCount = partySize - 1;
    const currentCount = fields.length;

    if (additionalCount > currentCount) {
      // Add more guest slots
      for (let i = currentCount; i < additionalCount; i++) {
        append({
          name: '',
          attendingEvents: [],
          dietaryRestrictions: '',
          arrivalDatetime: '',
          arrivalMode: '',
          departureDatetime: '',
          departureMode: '',
        });
      }
    } else if (additionalCount < currentCount) {
      // Remove excess guest slots
      for (let i = currentCount - 1; i >= additionalCount; i--) {
        remove(i);
      }
    }
  }, [partySize, fields.length, append, remove]);

  useEffect(() => {
    loadClientInfo();
  }, [clientId]);

  const loadClientInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/guest-register?clientId=${clientId}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to load event information');
        return;
      }

      setClientInfo(result.data);
    } catch (err) {
      console.error('Error loading client info:', err);
      setError('Failed to load event information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: GuestFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert event IDs to event titles for primary guest
      const primaryEventTitles = (data.attendingEvents || [])
        .map(eventId => clientInfo?.events.find(e => e.id === eventId)?.title)
        .filter(Boolean);

      // Get additional guests array with fallback
      const additionalGuests = data.additionalGuests || [];

      // Build additional guest names string
      const additionalGuestNames = additionalGuests
        .map(g => g.name)
        .filter(Boolean)
        .join(', ');

      // Build combined dietary restrictions
      const allDietary = [
        data.dietaryRestrictions ? `${data.name}: ${data.dietaryRestrictions}` : '',
        ...additionalGuests
          .filter(g => g.name && g.dietaryRestrictions)
          .map(g => `${g.name}: ${g.dietaryRestrictions}`)
      ].filter(Boolean).join('; ');

      const response = await fetch('/api/public/guest-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            partySize: data.partySize,
            additionalGuestNames: additionalGuestNames,
            arrivalDatetime: data.arrivalDatetime,
            arrivalMode: data.arrivalMode,
            departureDatetime: data.departureDatetime,
            departureMode: data.departureMode,
            relationshipToFamily: data.relationshipToFamily,
            attendingEvents: primaryEventTitles,
            dietaryRestrictions: allDietary || data.dietaryRestrictions,
            rsvpStatus: data.rsvpStatus,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit registration');
      }

      setSubmitSuccess(true);
      setSubmitMessage(result.message || 'Thank you for registering!');
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-pink-500" />
              <p className="text-sm text-muted-foreground">Loading event information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !clientInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle>Event Not Found</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This registration link may be invalid or the event may no longer be available.
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
    const handleClose = () => {
      window.close();
      setTimeout(() => {
        document.body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h1 style="font-size: 24px; margin-bottom: 8px; color: #16a34a;">Registration Complete!</h1>
            <p style="color: #666; margin-bottom: 24px;">You can safely close this tab now.</p>
            <p style="font-size: 12px; color: #999;">Press <kbd style="background: #eee; padding: 2px 6px; border-radius: 4px;">Ctrl+W</kbd> (Windows) or <kbd style="background: #eee; padding: 2px 6px; border-radius: 4px;">Cmd+W</kbd> (Mac) to close</p>
          </div>
        `;
      }, 100);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Registration Complete!</CardTitle>
                <CardDescription>{submitMessage}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <Heart className="h-12 w-12 mx-auto text-pink-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                We can&apos;t wait to celebrate with you!
              </p>
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close this page
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You can also close this tab manually
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4 py-8">
      <div className="container mx-auto max-w-2xl">
        {/* Event Header */}
        <Card className="mb-6 border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50">
          <CardHeader className="text-center pb-4">
            <Heart className="h-10 w-10 mx-auto text-pink-500 mb-2" />
            <CardTitle className="text-2xl">{clientInfo?.weddingName || 'Wedding Celebration'}</CardTitle>
            <CardDescription className="text-base">
              {clientInfo?.weddingDate
                ? `${new Date(clientInfo.weddingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                : 'Please fill out your details below'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Registration</CardTitle>
            <CardDescription>
              Please fill out details for yourself and your party
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Party Size Selection - First! */}
              <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-200">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-pink-600" />
                  <Label className="text-base font-medium">How many guests in your party?</Label>
                </div>
                <Select
                  value={String(partySize)}
                  onValueChange={(value) => setValue('partySize', parseInt(value))}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select number of guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num} {num === 1 ? 'Guest (just me)' : 'Guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {partySize > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please fill out details for all {partySize} guests below
                  </p>
                )}
              </div>

              {/* Guest 1 (Primary Guest) */}
              <div className="space-y-4 p-4 border rounded-lg bg-white">
                <div className="flex items-center gap-2 text-pink-600 border-b pb-2">
                  <User className="h-4 w-4" />
                  <h3 className="font-medium text-sm">Guest 1 (You) - Primary Contact</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter your full name"
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <span className="text-sm text-destructive">{errors.name.message}</span>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="+1 234 567 8900"
                      type="tel"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      {...register('email')}
                      placeholder="your@email.com"
                      type="email"
                    />
                    {errors.email && <span className="text-sm text-destructive">{errors.email.message}</span>}
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="relationshipToFamily">Relationship to the Family</Label>
                    <Input
                      id="relationshipToFamily"
                      {...register('relationshipToFamily')}
                      placeholder="e.g., Friend of bride, Uncle, Colleague"
                    />
                  </div>
                </div>

                {/* Guest 1 Event Preferences */}
                <div className="space-y-3 pt-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-pink-600" />
                    Events You Will Attend
                  </Label>
                  <EventCheckboxes
                    events={clientInfo?.events || []}
                    selectedEvents={primaryAttendingEvents}
                    onChange={(events) => setValue('attendingEvents', events)}
                  />
                </div>

                {/* Guest 1 Dietary */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="dietaryRestrictions" className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    Dietary Requirements
                  </Label>
                  <Input
                    id="dietaryRestrictions"
                    {...register('dietaryRestrictions')}
                    placeholder="e.g., Vegetarian, Vegan, Allergies"
                  />
                </div>

                {/* Primary Guest Travel Details */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-pink-600" />
                    Your Travel Details
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="arrivalDatetime" className="text-xs text-muted-foreground">Arrival Date & Time</Label>
                      <Input
                        id="arrivalDatetime"
                        {...register('arrivalDatetime')}
                        type="datetime-local"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arrivalMode" className="text-xs text-muted-foreground">Mode of Arrival</Label>
                      <Input
                        id="arrivalMode"
                        {...register('arrivalMode')}
                        placeholder="e.g., Flight, Car, Train"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departureDatetime" className="text-xs text-muted-foreground">Departure Date & Time</Label>
                      <Input
                        id="departureDatetime"
                        {...register('departureDatetime')}
                        type="datetime-local"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departureMode" className="text-xs text-muted-foreground">Mode of Departure</Label>
                      <Input
                        id="departureMode"
                        {...register('departureMode')}
                        placeholder="e.g., Flight, Car, Train"
                      />
                    </div>
                  </div>
                </div>

                {/* Same for All Button - Only show when multiple guests */}
                {partySize > 1 && (
                  <div className="pt-3 border-t mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-pink-600 border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                      onClick={() => {
                        // Copy primary guest's events, dietary, and travel to all additional guests
                        const primaryEvents = watch('attendingEvents') || [];
                        const primaryDietary = watch('dietaryRestrictions') || '';
                        const primaryArrivalDatetime = watch('arrivalDatetime') || '';
                        const primaryArrivalMode = watch('arrivalMode') || '';
                        const primaryDepartureDatetime = watch('departureDatetime') || '';
                        const primaryDepartureMode = watch('departureMode') || '';

                        fields.forEach((_, index) => {
                          setValue(`additionalGuests.${index}.attendingEvents`, [...primaryEvents]);
                          setValue(`additionalGuests.${index}.dietaryRestrictions`, primaryDietary);
                          setValue(`additionalGuests.${index}.arrivalDatetime`, primaryArrivalDatetime);
                          setValue(`additionalGuests.${index}.arrivalMode`, primaryArrivalMode);
                          setValue(`additionalGuests.${index}.departureDatetime`, primaryDepartureDatetime);
                          setValue(`additionalGuests.${index}.departureMode`, primaryDepartureMode);
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Same for all guests (copy events, dietary & travel to all)
                    </Button>
                  </div>
                )}
              </div>

              {/* Additional Guests (Guest 2, 3, etc.) */}
              {fields.map((field, index) => {
                const guestNumber = index + 2;
                const guestEvents = watch(`additionalGuests.${index}.attendingEvents`) || [];

                return (
                  <div key={field.id} className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2 text-pink-600 border-b pb-2">
                      <User className="h-4 w-4" />
                      <h3 className="font-medium text-sm">Guest {guestNumber}</h3>
                    </div>

                    {/* Guest Name */}
                    <div className="space-y-2">
                      <Label htmlFor={`additionalGuests.${index}.name`}>Full Name *</Label>
                      <Input
                        id={`additionalGuests.${index}.name`}
                        {...register(`additionalGuests.${index}.name`)}
                        placeholder={`Enter Guest ${guestNumber}'s full name`}
                        className={errors.additionalGuests?.[index]?.name ? 'border-destructive' : ''}
                      />
                      {errors.additionalGuests?.[index]?.name && (
                        <span className="text-sm text-destructive">
                          {errors.additionalGuests[index]?.name?.message}
                        </span>
                      )}
                    </div>

                    {/* Guest Event Preferences */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-pink-600" />
                        Events Attending
                      </Label>
                      <EventCheckboxes
                        events={clientInfo?.events || []}
                        selectedEvents={guestEvents}
                        onChange={(events) => setValue(`additionalGuests.${index}.attendingEvents`, events)}
                      />
                    </div>

                    {/* Guest Dietary */}
                    <div className="space-y-2">
                      <Label htmlFor={`additionalGuests.${index}.dietaryRestrictions`} className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                        Dietary Requirements
                      </Label>
                      <Input
                        id={`additionalGuests.${index}.dietaryRestrictions`}
                        {...register(`additionalGuests.${index}.dietaryRestrictions`)}
                        placeholder="e.g., Vegetarian, Vegan, Allergies"
                      />
                    </div>

                    {/* Guest Travel Details */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-pink-600" />
                        Travel Details
                      </Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`additionalGuests.${index}.arrivalDatetime`} className="text-xs text-muted-foreground">Arrival Date & Time</Label>
                          <Input
                            id={`additionalGuests.${index}.arrivalDatetime`}
                            {...register(`additionalGuests.${index}.arrivalDatetime`)}
                            type="datetime-local"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`additionalGuests.${index}.arrivalMode`} className="text-xs text-muted-foreground">Mode of Arrival</Label>
                          <Input
                            id={`additionalGuests.${index}.arrivalMode`}
                            {...register(`additionalGuests.${index}.arrivalMode`)}
                            placeholder="e.g., Flight, Car, Train"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`additionalGuests.${index}.departureDatetime`} className="text-xs text-muted-foreground">Departure Date & Time</Label>
                          <Input
                            id={`additionalGuests.${index}.departureDatetime`}
                            {...register(`additionalGuests.${index}.departureDatetime`)}
                            type="datetime-local"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`additionalGuests.${index}.departureMode`} className="text-xs text-muted-foreground">Mode of Departure</Label>
                          <Input
                            id={`additionalGuests.${index}.departureMode`}
                            {...register(`additionalGuests.${index}.departureMode`)}
                            placeholder="e.g., Flight, Car, Train"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* RSVP Confirmation */}
              <div className="p-4 bg-pink-50 rounded-lg space-y-3 border border-pink-200">
                <Label className="text-pink-900">
                  Confirm Attendance {partySize > 1 ? `for all ${partySize} guests` : ''}
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="accepted"
                      {...register('rsvpStatus')}
                      defaultChecked
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm">Yes, {partySize > 1 ? "we'll" : "I'll"} attend!</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="declined"
                      {...register('rsvpStatus')}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm">Sorry, can&apos;t make it</span>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Submit RSVP {partySize > 1 ? `for ${partySize} Guests` : ''}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by WeddingFlo
        </p>
      </div>
    </div>
  );
}
