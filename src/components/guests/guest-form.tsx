'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestFormSchema, GuestFormValues } from '@/lib/validations/guest.schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface GuestFormProps {
  defaultValues?: Partial<GuestFormValues>;
  onSubmit: (data: GuestFormValues) => Promise<void>;
  isLoading?: boolean;
  availableEvents?: { id: string; name: string }[];
  isPlannerView?: boolean; // Show planner-only fields
}

export function GuestForm({
  defaultValues,
  onSubmit,
  isLoading,
  availableEvents = [],
  isPlannerView = true,
}: GuestFormProps) {
  const [additionalGuestInput, setAdditionalGuestInput] = useState('');

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      party_size: 1,
      additional_guest_names: [],
      arrival_datetime: '',
      arrival_mode: undefined,
      departure_datetime: '',
      departure_mode: undefined,
      relationship_to_family: '',
      group_name: '',
      guest_side: 'mutual',
      attending_events: [],
      rsvp_status: 'pending',
      meal_preference: undefined,
      dietary_restrictions: '',
      plus_one_allowed: false,
      plus_one_name: '',
      hotel_required: false,
      hotel_name: '',
      hotel_check_in: '',
      hotel_check_out: '',
      hotel_room_type: '',
      transport_required: false,
      transport_type: '',
      transport_pickup_location: '',
      transport_pickup_time: '',
      transport_notes: '',
      gift_to_give: '',
      notes: '',
      ...defaultValues,
    },
  });

  const handleAddAdditionalGuest = () => {
    const currentGuests = form.getValues('additional_guest_names') || [];
    if (additionalGuestInput.trim() && !currentGuests.includes(additionalGuestInput.trim())) {
      form.setValue('additional_guest_names', [...currentGuests, additionalGuestInput.trim()]);
      setAdditionalGuestInput('');
    }
  };

  const handleRemoveAdditionalGuest = (name: string) => {
    const currentGuests = form.getValues('additional_guest_names') || [];
    form.setValue(
      'additional_guest_names',
      currentGuests.filter((g) => g !== name)
    );
  };

  const handleEventToggle = (eventId: string) => {
    const currentEvents = form.getValues('attending_events') || [];
    if (currentEvents.includes(eventId)) {
      form.setValue(
        'attending_events',
        currentEvents.filter((e) => e !== eventId)
      );
    } else {
      form.setValue('attending_events', [...currentEvents, eventId]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>

          <FormField
            control={form.control}
            name="guest_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guest_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guest_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="party_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Packs (Party Size) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>Total number of people in this guest party</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship_to_family"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to Family</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Uncle, College Friend" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Additional Guest Names */}
          <FormField
            control={form.control}
            name="additional_guest_names"
            render={() => (
              <FormItem>
                <FormLabel>Additional Guest Names</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add guest name..."
                    value={additionalGuestInput}
                    onChange={(e) => setAdditionalGuestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAdditionalGuest();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddAdditionalGuest}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.watch('additional_guest_names') || []).map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalGuest(name)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Travel Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Travel Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="arrival_datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arrival_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode of Arrival</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="train">Train</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="departure_datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departure_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode of Departure</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="train">Train</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Events and Group */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Events & Group</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="group_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bride's Family, College Friends" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guest_side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Side</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select side" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bride_side">Bride&apos;s Side</SelectItem>
                      <SelectItem value="groom_side">Groom&apos;s Side</SelectItem>
                      <SelectItem value="mutual">Mutual (Both)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Which family does this guest belong to?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {availableEvents.length > 0 && (
            <FormField
              control={form.control}
              name="attending_events"
              render={() => (
                <FormItem>
                  <FormLabel>Attending Events</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {availableEvents.map((event) => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(form.watch('attending_events') || []).includes(event.id)}
                          onCheckedChange={() => handleEventToggle(event.id)}
                        />
                        <label className="text-sm">{event.name}</label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Separator />

        {/* Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Preferences</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rsvp_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSVP Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meal_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Preference</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="dietary_restrictions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dietary Restrictions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Allergies, food restrictions, etc."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plus_one_allowed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Allow Plus One</FormLabel>
                  <FormDescription>
                    Guest is allowed to bring a plus one
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {form.watch('plus_one_allowed') && (
            <FormField
              control={form.control}
              name="plus_one_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plus One Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Planner-Only Fields */}
        {isPlannerView && (
          <>
            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Planner Notes</h3>
              <p className="text-sm text-muted-foreground">These fields are only visible to planners</p>

              <FormField
                control={form.control}
                name="hotel_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Hotel Accommodation Required</FormLabel>
                      <FormDescription>
                        Guest needs hotel accommodation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('hotel_required') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <FormField
                    control={form.control}
                    name="hotel_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hotel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Hotel name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hotel_room_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Double, Suite" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hotel_check_in"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hotel_check_out"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="transport_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Transport Required</FormLabel>
                      <FormDescription>
                        Guest needs transportation arrangement
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('transport_required') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <FormField
                    control={form.control}
                    name="transport_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Airport Pickup, Shuttle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transport_pickup_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Airport Terminal 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transport_pickup_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transport_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional details" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="gift_to_give"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gift to be Given</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Welcome basket, Saree" {...field} />
                    </FormControl>
                    <FormDescription>
                      Gift planned for this guest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements / Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requirements or notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Guest'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
