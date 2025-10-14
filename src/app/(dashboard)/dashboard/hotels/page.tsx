'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { HotelStatsCards } from '@/components/hotels/hotel-stats';
import { HotelManagementList } from '@/components/hotels/hotel-management-list';
import { HotelForm } from '@/components/hotels/hotel-form';
import { Hotel, HotelStats } from '@/types/hotel';
import { HotelFormValues } from '@/lib/validations/hotel.schema';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function HotelsPage() {
  const { toast } = useToast();

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Use first client for now (in production, add client selector)
  const selectedClient = clients?.[0];
  const clientId = selectedClient?._id;

  const hotels = useQuery(api.hotels.list, clientId ? { clientId } : 'skip');
  const hotelDetails = useQuery(api.hotelDetails.list, clientId ? { clientId } : 'skip');
  const createHotel = useMutation(api.hotels.create);
  const deleteHotel = useMutation(api.hotels.deleteHotel);

  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hotelFilter, setHotelFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('hotels');
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setHotelFilter(filter);
    // Switch to accommodations tab when filtering (since filters apply to accommodations)
    if (filter) {
      setActiveTab('accommodations');
      // Scroll to results on mobile after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleAddHotel = () => {
    setSelectedHotel(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: HotelFormValues) => {
    if (!currentUser?.company_id || !clientId) {
      toast({
        title: 'Error',
        description: 'Missing company or client information',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createHotel({
        company_id: currentUser.company_id,
        client_id: clientId,
        hotel_name: data.hotel_name,
        address: data.address,
        phone: data.phone,
        email: data.email || undefined,
        website: data.website || undefined,
        room_types: data.room_types,
        amenities: data.amenities,
        rating: data.rating,
      });

      toast({
        title: 'Success',
        description: 'Hotel added successfully',
      });
      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add hotel',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    toast({
      title: 'Coming Soon',
      description: 'Edit hotel functionality will be implemented',
    });
  };

  const handleDeleteHotel = async (hotel: Hotel) => {
    if (!window.confirm(`Are you sure you want to delete ${hotel.hotel_name}?`)) {
      return;
    }

    try {
      await deleteHotel({ hotelId: hotel._id });
      toast({
        title: 'Success',
        description: 'Hotel deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete hotel',
        variant: 'destructive',
      });
    }
  };

  const handleAddGuestAccommodation = () => {
    toast({
      title: 'Coming Soon',
      description: 'Guest accommodation form will be implemented',
    });
  };

  // Loading state
  if (currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage hotels.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients, hotels, and hotel details
  if (clients === undefined || hotels === undefined || hotelDetails === undefined) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage hotels.
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats: HotelStats = {
    total_hotels: hotels.length,
    total_rooms_booked: hotels.reduce(
      (sum, h) => sum + h.room_types.reduce((s, rt) => s + rt.blocked_rooms, 0),
      0
    ),
    total_guests_accommodated: hotelDetails.length,
    occupancy_rate:
      hotels.length > 0
        ? (hotels.reduce(
            (sum, h) => sum + h.room_types.reduce((s, rt) => s + rt.blocked_rooms, 0),
            0
          ) /
            hotels.reduce(
              (sum, h) => sum + h.room_types.reduce((s, rt) => s + rt.total_rooms, 0),
              0
            )) *
          100
        : 0,
    pending_bookings: hotelDetails.filter((hd) => hd.accommodation_status === false).length,
    confirmed_bookings: hotelDetails.filter((hd) => hd.accommodation_status === true)
      .length,
  };

  // Filter hotel details based on active filter
  const filteredHotelDetails = (() => {
    if (!hotelFilter) return hotelDetails;

    switch (hotelFilter) {
      case 'all':
      case 'accommodated':
        return hotelDetails;
      case 'pending':
        return hotelDetails.filter((hd) => hd.accommodation_status === false);
      case 'confirmed':
        return hotelDetails.filter((hd) => hd.accommodation_status === true);
      default:
        return hotelDetails;
    }
  })();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-friendly header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Hotels</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            Manage hotel bookings and guest accommodations
          </p>
        </div>
        <div className="sm:ml-4">
          <Button onClick={handleAddHotel} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Hotel</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList ref={resultsRef} className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="hotels" className="text-xs sm:text-sm py-2">Manage Hotels</TabsTrigger>
          <TabsTrigger value="accommodations" className="text-xs sm:text-sm py-2">Guest Accommodations</TabsTrigger>
        </TabsList>

        <TabsContent value="hotels" className="space-y-4">
          <HotelStatsCards
            stats={stats}
            isLoading={false}
            onFilterChange={handleFilterChange}
          />
          {hotelFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredHotelDetails.length} of {hotelDetails.length} accommodations
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHotelFilter(null)}
                className="h-7 px-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}
          <HotelManagementList
            hotels={hotels}
            isLoading={false}
            onEdit={handleEditHotel}
            onDelete={handleDeleteHotel}
          />
        </TabsContent>

        <TabsContent value="accommodations" className="space-y-4">
          <HotelStatsCards
            stats={stats}
            isLoading={false}
            onFilterChange={handleFilterChange}
          />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Guest Accommodations</h3>
              <p className="text-sm text-muted-foreground">
                Manage room assignments for your guests
              </p>
            </div>
            <Button onClick={handleAddGuestAccommodation}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Room
            </Button>
          </div>

          {hotelFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredHotelDetails.length} of {hotelDetails.length} accommodations
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHotelFilter(null)}
                className="h-7 px-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}

          {filteredHotelDetails.length === 0 ? (
            <EmptyState
              title="No guest accommodations yet"
              description="Start by assigning hotel rooms to your guests"
              action={{
                label: 'Assign Room',
                onClick: handleAddGuestAccommodation,
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHotelDetails.map((detail) => (
                <div key={detail._id} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Room {detail.room_number || 'TBD'}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          detail.accommodation_status
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {detail.accommodation_status ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {detail.room_type?.replace('_', ' ') || 'N/A'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <div>
                        Check-in: {detail.check_in_date ? new Date(detail.check_in_date).toLocaleDateString() : 'TBD'}
                      </div>
                      <div>
                        Check-out: {detail.check_out_date ? new Date(detail.check_out_date).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      ${detail.total_cost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Hotel Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedHotel ? 'Edit Hotel' : 'Add New Hotel'}
            </SheetTitle>
            <SheetDescription>
              Enter the hotel details below. Fields marked with * are required.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <HotelForm
              defaultValues={selectedHotel || undefined}
              onSubmit={handleFormSubmit}
              isLoading={isSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
