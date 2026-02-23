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
          <SheetTitle>{`${guest.firstName} ${guest.lastName || ''}`.trim()}</SheetTitle>
          <SheetDescription>Guest details and information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {guest.groupName && (
              <Badge variant="outline">
                {guest.groupName}
              </Badge>
            )}
            {guest.rsvpStatus === 'confirmed' && (
              <Badge className="bg-green-600">RSVP Confirmed</Badge>
            )}
            {guest.checkedIn && (
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
            {guest.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{guest.phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Party Information */}
          {guest.partySize > 1 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Party ({guest.partySize} guests)</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {guest.additionalGuestNames && guest.additionalGuestNames.length > 0
                      ? guest.additionalGuestNames.join(', ')
                      : 'Names not provided'}
                  </span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Preferences */}
          {guest.dietaryRestrictions && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Preferences</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Dietary:</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {guest.dietaryRestrictions}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Check-in Information */}
          {guest.checkedIn && guest.checkedInAt && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Check-in Information</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(guest.checkedInAt), 'PPpp')}</span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {guest.notes && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  {guest.notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Timestamps */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Created: {format(new Date(guest.createdAt), 'PPp')}</p>
            <p>Last updated: {format(new Date(guest.updatedAt), 'PPp')}</p>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            {(guest.email || guest.phone) && (
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
          guestName={`${guest.firstName} ${guest.lastName || ''}`.trim()}
          guestEmail={guest.email ?? undefined}
          guestPhone={guest.phone ?? undefined}
        />
      </SheetContent>
    </Sheet>
  );
}
