'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Guest } from '@/types/guest';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  Users,
  Utensils,
  Hotel,
  MapPin,
  Calendar,
  CheckCircle,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { SendCommunicationDialog } from '@/components/communication/send-communication-dialog';

interface GuestDetailsSheetProps {
  guest: Guest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function GuestDetailsSheet({
  guest,
  open,
  onOpenChange,
  onEdit,
}: GuestDetailsSheetProps) {
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);

  if (!guest) return null;

  const categoryLabels: Record<string, string> = {
    bride_family: 'Bride Family',
    groom_family: 'Groom Family',
    bride_friends: 'Bride Friends',
    groom_friends: 'Groom Friends',
    colleagues: 'Colleagues',
    relatives: 'Relatives',
    vip: 'VIP',
  };

  const mealLabels: Record<string, string> = {
    veg: 'Vegetarian',
    non_veg: 'Non-Vegetarian',
    vegan: 'Vegan',
    jain: 'Jain',
    custom: 'Custom',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{guest.guest_name}</SheetTitle>
          <SheetDescription>Guest details and information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {guest.guest_category && (
              <Badge variant="outline">
                {categoryLabels[guest.guest_category] || guest.guest_category}
              </Badge>
            )}
            {guest.form_submitted && (
              <Badge className="bg-green-600">RSVP Confirmed</Badge>
            )}
            {guest.checked_in && (
              <Badge className="bg-green-600">
                <CheckCircle className="mr-1 h-3 w-3" />
                Checked In
              </Badge>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold">Contact Information</h3>
            {guest.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{guest.email}</span>
              </div>
            )}
            {guest.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{guest.phone_number}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Additional Guests */}
          {guest.number_of_packs > 1 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Additional Guests ({guest.number_of_packs - 1})</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {guest.additional_guest_names.length > 0
                      ? guest.additional_guest_names.join(', ')
                      : 'Names not provided'}
                  </span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Preferences */}
          {(guest.dietary_restrictions.length > 0 || guest.seating_preferences.length > 0) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Preferences</h3>
                {guest.dietary_restrictions.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Dietary:</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {guest.dietary_restrictions.join(', ')}
                    </p>
                  </div>
                )}
                {guest.seating_preferences.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Seating Preferences:</p>
                    <p className="text-sm text-muted-foreground">
                      {guest.seating_preferences.join(', ')}
                    </p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          <Separator />

          {/* Check-in Information */}
          {guest.checked_in && guest.checked_in_at && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Check-in Information</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(guest.checked_in_at, 'PPpp')}</span>
                </div>
                {guest.checked_in_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {guest.checked_in_location.lat.toFixed(6)},{' '}
                      {guest.checked_in_location.lng.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Additional Information */}
          {guest.special_needs && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Additional Information</h3>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Special Needs:</p>
                  <p className="text-sm text-muted-foreground">
                    {guest.special_needs}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Timestamps */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Created: {format(guest.created_at, 'PPp')}</p>
            <p>Last updated: {format(guest.updated_at, 'PPp')}</p>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            {(guest.email || guest.phone_number) && (
              <Button
                onClick={() => setShowCommunicationDialog(true)}
                variant="outline"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} className="w-full">
                Edit Guest
              </Button>
            )}
          </div>
        </div>

        {/* Communication Dialog */}
        <SendCommunicationDialog
          open={showCommunicationDialog}
          onOpenChange={setShowCommunicationDialog}
          guestName={guest.guest_name}
          guestEmail={guest.email}
          guestPhone={guest.phone_number}
        />
      </SheetContent>
    </Sheet>
  );
}
