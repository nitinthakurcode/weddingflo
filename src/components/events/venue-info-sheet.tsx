'use client';

import { VenueDetails } from '@/types/event';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MapPin, Phone, Mail, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface VenueInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueDetails;
  eventName?: string;
}

export function VenueInfoSheet({
  open,
  onOpenChange,
  venue,
  eventName,
}: VenueInfoSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{venue.name}</SheetTitle>
          <SheetDescription>
            {eventName && `Venue for ${eventName}`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Address Section */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">{venue.address}</p>
                <p className="text-sm text-gray-600">
                  {venue.city}, {venue.state} {venue.postal_code}
                </p>
                <p className="text-sm text-gray-600">{venue.country}</p>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border">
              <div className="text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Map View</p>
                <p className="text-xs">Coming soon</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          {(venue.contact_name || venue.contact_phone || venue.contact_email) && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Contact Information</h4>

                {venue.contact_name && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-medium text-gray-900">{venue.contact_name}</p>
                    </div>
                  </div>
                )}

                {venue.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <a
                        href={`tel:${venue.contact_phone}`}
                        className="font-medium text-purple-600 hover:text-purple-700"
                      >
                        {venue.contact_phone}
                      </a>
                    </div>
                  </div>
                )}

                {venue.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a
                        href={`mailto:${venue.contact_email}`}
                        className="font-medium text-purple-600 hover:text-purple-700"
                      >
                        {venue.contact_email}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Venue Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Venue Details</h4>

            {venue.capacity && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Capacity</p>
                  <p className="font-medium text-gray-900">{venue.capacity} guests</p>
                </div>
              </div>
            )}

            {venue.notes && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Additional Notes</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {venue.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
