'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GuestForm } from './guest-form';
import { GuestFormValues } from '@/lib/validations/guest.schema';
import { Guest } from '@/types/guest';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

interface GuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: Guest;
  clientId: string;
  companyId: string;
}

export function GuestDialog({
  open,
  onOpenChange,
  guest,
  clientId,
  companyId,
}: GuestDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const createGuest = trpc.guests.create.useMutation({
    onSuccess: () => {
      utils.guests.getAll.invalidate({ clientId });
    },
  });

  const updateGuest = trpc.guests.update.useMutation({
    onSuccess: () => {
      utils.guests.getAll.invalidate({ clientId });
    },
  });

  const handleSubmit = async (data: GuestFormValues) => {
    try {
      setIsLoading(true);

      // Build guest data with camelCase fields (router expects 'name' and splits it)
      const guestData = {
        name: data.guest_name,
        email: data.guest_email || undefined,
        phone: data.guest_phone || undefined,
        partySize: data.party_size,
        additionalGuestNames: data.additional_guest_names || [],
        arrivalDatetime: data.arrival_datetime || undefined,
        arrivalMode: data.arrival_mode || undefined,
        departureDatetime: data.departure_datetime || undefined,
        departureMode: data.departure_mode || undefined,
        relationshipToFamily: data.relationship_to_family || undefined,
        groupName: data.group_name || undefined,
        guestSide: data.guest_side || 'mutual',
        attendingEvents: data.attending_events || [],
        rsvpStatus: data.rsvp_status || 'pending',
        mealPreference: data.meal_preference || undefined,
        dietaryRestrictions: data.dietary_restrictions || undefined,
        plusOne: data.plus_one_allowed || false,
        hotelRequired: data.hotel_required || false,
        hotelName: data.hotel_name || undefined,
        hotelCheckIn: data.hotel_check_in || undefined,
        hotelCheckOut: data.hotel_check_out || undefined,
        hotelRoomType: data.hotel_room_type || undefined,
        transportRequired: data.transport_required || false,
        transportType: data.transport_type || undefined,
        transportPickupLocation: data.transport_pickup_location || undefined,
        transportPickupTime: data.transport_pickup_time || undefined,
        transportNotes: data.transport_notes || undefined,
        giftToGive: data.gift_to_give || undefined,
        notes: data.notes || undefined,
      };

      if (guest) {
        // Update existing guest
        await updateGuest.mutateAsync({
          id: guest.id,
          data: guestData,
        });
        toast({
          title: 'Success',
          description: 'Guest updated successfully',
        });
      } else {
        // Create new guest
        await createGuest.mutateAsync({
          clientId,
          ...guestData,
        });
        toast({
          title: 'Success',
          description: 'Guest created successfully',
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save guest',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guest ? 'Edit Guest' : 'Add New Guest'}</DialogTitle>
          <DialogDescription>
            {guest
              ? 'Update the guest information below.'
              : 'Fill in the guest details to add them to your guest list.'}
          </DialogDescription>
        </DialogHeader>
        <GuestForm
          defaultValues={guest as any}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
