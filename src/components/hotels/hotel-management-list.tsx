'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, Star } from 'lucide-react';
import { Hotel } from '@/types/hotel';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HotelManagementListProps {
  hotels: Hotel[];
  isLoading?: boolean;
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotel: Hotel) => void;
}

export function HotelManagementList({
  hotels,
  isLoading,
  onEdit,
  onDelete,
}: HotelManagementListProps) {
  const columns: ColumnDef<Hotel>[] = [
    {
      accessorKey: 'hotel_name',
      header: 'Hotel Name',
      cell: ({ row }) => {
        const hotel = row.original;
        return (
          <div>
            <div className="font-medium">{hotel.hotel_name}</div>
            {hotel.address && (
              <div className="text-sm text-muted-foreground">
                {hotel.address}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'star_rating',
      header: 'Rating',
      cell: ({ row }) => {
        const rating = row.getValue('star_rating') as number | undefined;
        return rating ? (
          <div className="flex items-center">
            {[...Array(rating)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not rated</span>
        );
      },
    },
    {
      header: 'Rooms',
      cell: ({ row }) => {
        const hotel = row.original;
        const totalRooms = hotel.room_types.reduce((sum, rt) => sum + rt.total_rooms, 0);
        const bookedRooms = hotel.room_types.reduce((sum, rt) => sum + rt.blocked_rooms, 0);
        return (
          <div className="text-sm">
            <div>{bookedRooms} / {totalRooms}</div>
            <div className="text-muted-foreground">
              {totalRooms > 0 ? ((bookedRooms / totalRooms) * 100).toFixed(0) : 0}% occupied
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact',
      cell: ({ row }) => {
        const hotel = row.original;
        return (
          <div className="text-sm">
            {hotel.phone && <div>{hotel.phone}</div>}
            {hotel.email && (
              <div className="text-muted-foreground">{hotel.email}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Amenities',
      cell: ({ row }) => {
        const hotel = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {hotel.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{hotel.amenities.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const hotel = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(hotel)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(hotel)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={hotels}
      searchKey="hotel_name"
      searchPlaceholder="Search hotels..."
      isLoading={isLoading}
      emptyState={{
        title: 'No hotels found',
        description: 'Get started by adding your first hotel.',
      }}
    />
  );
}
