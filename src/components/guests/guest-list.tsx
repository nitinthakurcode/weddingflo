'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, QrCode, CheckCircle } from 'lucide-react';
import { Guest } from '@/types/guest';
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
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface GuestListProps {
  guests: Guest[];
  isLoading?: boolean;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onViewQR: (guest: Guest) => void;
  onCheckIn: (guest: Guest) => void;
  onRowClick?: (guest: Guest) => void;
}

export function GuestList({
  guests,
  isLoading,
  onEdit,
  onDelete,
  onViewQR,
  onCheckIn,
  onRowClick,
}: GuestListProps) {
  const columns: ColumnDef<Guest>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => {
        const guest = row.original;
        const hasPlus = guest.additionalGuestNames && guest.additionalGuestNames.length > 0;
        return (
          <div>
            <div className="font-medium">{`${guest.firstName} ${guest.lastName || ''}`.trim()}</div>
            {hasPlus && guest.additionalGuestNames && (
              <div className="text-sm text-muted-foreground">
                +{guest.additionalGuestNames.length}: {guest.additionalGuestNames.join(', ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => {
        const guest = row.original;
        return (
          <div className="text-sm">
            {guest.email && <div>{guest.email}</div>}
            {guest.phone && (
              <div className="text-muted-foreground">{guest.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'groupName',
      header: 'Group',
      cell: ({ row }) => {
        const group = row.getValue('groupName') as string;
        if (!group) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <Badge variant="outline">{group}</Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'relationshipToFamily',
      header: 'Side',
      cell: ({ row }) => {
        const side = row.getValue('relationshipToFamily') as string | undefined;
        if (!side) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <Badge
            variant={
              side === 'bride'
                ? 'default'
                : side === 'groom'
                ? 'secondary'
                : 'outline'
            }
          >
            {side.charAt(0).toUpperCase() + side.slice(1)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'attendingEvents',
      header: 'Events',
      cell: ({ row }) => {
        const events = row.getValue('attendingEvents') as string[];
        if (!events || events.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <Badge variant="outline">{events.length} event(s)</Badge>;
      },
    },
    {
      accessorKey: 'rsvpStatus',
      header: 'RSVP',
      cell: ({ row }) => {
        const status = row.getValue('rsvpStatus') as string;
        if (status === 'confirmed') {
          return <Badge className="bg-green-600">Confirmed</Badge>;
        } else if (status === 'declined') {
          return <Badge variant="destructive">Declined</Badge>;
        } else if (status === 'maybe') {
          return <Badge variant="outline" className="border-amber-400 text-amber-600">Maybe</Badge>;
        }
        return <Badge variant="outline">Pending</Badge>;
      },
    },
    {
      accessorKey: 'checkedIn',
      header: 'Check-in',
      cell: ({ row }) => {
        const checkedIn = row.getValue('checkedIn') as boolean;
        const checkedInAt = row.original.checkedInAt;
        return checkedIn ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">
              {checkedInAt && format(new Date(checkedInAt), 'MMM d, HH:mm')}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not checked in</span>
        );
      },
    },
    {
      accessorKey: 'dietaryRestrictions',
      header: 'Dietary',
      cell: ({ row }) => {
        const restrictions = row.getValue('dietaryRestrictions') as string;
        if (!restrictions) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <Badge variant="outline">{restrictions}</Badge>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const guest = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(guest)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewQR(guest)}>
                <QrCode className="mr-2 h-4 w-4" />
                View QR Code
              </DropdownMenuItem>
              {!guest.checkedIn && (
                <DropdownMenuItem onClick={() => onCheckIn(guest)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check In
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(guest)}
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
      data={guests}
      searchKey="firstName"
      searchPlaceholder="Search guests..."
      filters={[
        {
          column: 'relationshipToFamily',
          title: 'Side',
          options: [
            { label: 'Bride', value: 'bride' },
            { label: 'Groom', value: 'groom' },
            { label: 'Neutral', value: 'neutral' },
          ],
        },
        {
          column: 'rsvpStatus',
          title: 'RSVP',
          options: [
            { label: 'Accepted', value: 'accepted' },
            { label: 'Pending', value: 'pending' },
            { label: 'Declined', value: 'declined' },
          ],
        },
      ]}
      onRowClick={onRowClick}
      isLoading={isLoading}
      emptyState={{
        title: 'No guests found',
        description: 'Get started by adding your first guest to the list.',
      }}
    />
  );
}
