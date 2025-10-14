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
      accessorKey: 'guest_name',
      header: 'Name',
      cell: ({ row }) => {
        const guest = row.original;
        const hasPlus = guest.additional_guest_names && guest.additional_guest_names.length > 0;
        return (
          <div>
            <div className="font-medium">{guest.guest_name}</div>
            {hasPlus && (
              <div className="text-sm text-muted-foreground">
                +{guest.additional_guest_names.length}: {guest.additional_guest_names.join(', ')}
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
            {guest.phone_number && (
              <div className="text-muted-foreground">{guest.phone_number}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'guest_category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('guest_category') as string;
        const categoryLabels: Record<string, string> = {
          bride_family: 'Bride Family',
          groom_family: 'Groom Family',
          bride_friends: 'Bride Friends',
          groom_friends: 'Groom Friends',
          colleagues: 'Colleagues',
          relatives: 'Relatives',
          vip: 'VIP',
        };
        return (
          <Badge variant="outline">{categoryLabels[category] || category}</Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'relationship_to_family',
      header: 'Side',
      cell: ({ row }) => {
        const side = row.getValue('relationship_to_family') as string | undefined;
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
      accessorKey: 'events_attending',
      header: 'Events',
      cell: ({ row }) => {
        const events = row.getValue('events_attending') as string[];
        if (!events || events.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <Badge variant="outline">{events.length} event(s)</Badge>;
      },
    },
    {
      accessorKey: 'form_submitted',
      header: 'RSVP',
      cell: ({ row }) => {
        const submitted = row.getValue('form_submitted') as boolean;
        return submitted ? (
          <Badge className="bg-green-600">Confirmed</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        );
      },
    },
    {
      accessorKey: 'checked_in',
      header: 'Check-in',
      cell: ({ row }) => {
        const checkedIn = row.getValue('checked_in') as boolean;
        const checkedInAt = row.original.checked_in_at;
        return checkedIn ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">
              {checkedInAt && format(checkedInAt, 'MMM d, HH:mm')}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not checked in</span>
        );
      },
    },
    {
      accessorKey: 'dietary_restrictions',
      header: 'Dietary',
      cell: ({ row }) => {
        const restrictions = row.getValue('dietary_restrictions') as string[];
        if (!restrictions || restrictions.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <Badge variant="outline">{restrictions.length} restriction(s)</Badge>;
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
              {!guest.checked_in && (
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
      searchKey="guest_name"
      searchPlaceholder="Search guests..."
      filters={[
        {
          column: 'guest_category',
          title: 'Category',
          options: [
            { label: 'Bride Family', value: 'bride_family' },
            { label: 'Groom Family', value: 'groom_family' },
            { label: 'Bride Friends', value: 'bride_friends' },
            { label: 'Groom Friends', value: 'groom_friends' },
            { label: 'Colleagues', value: 'colleagues' },
            { label: 'Relatives', value: 'relatives' },
            { label: 'VIP', value: 'vip' },
          ],
        },
        {
          column: 'relationship_to_family',
          title: 'Side',
          options: [
            { label: 'Bride', value: 'bride' },
            { label: 'Groom', value: 'groom' },
            { label: 'Neutral', value: 'neutral' },
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
