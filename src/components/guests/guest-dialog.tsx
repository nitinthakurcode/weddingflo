'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
import { Id } from '@/convex/_generated/dataModel';

interface GuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: Guest;
  clientId: Id<'clients'>;
  companyId: Id<'companies'>;
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
  const createGuest = useMutation(api.guests.create);
  const updateGuest = useMutation(api.guests.update);

  const handleSubmit = async (data: GuestFormValues) => {
    try {
      setIsLoading(true);

      if (guest) {
        // Update existing guest
        // Transform dietary_restrictions and seating_preference from strings to arrays for update
        const { dietary_restrictions, seating_preference, ...rest } = data;

        await updateGuest({
          guestId: guest._id,
          ...rest as any,
          dietary_restrictions: dietary_restrictions ? [dietary_restrictions] : [],
          seating_preferences: seating_preference ? [seating_preference] : [],
        });
        toast({
          title: 'Success',
          description: 'Guest updated successfully',
        });
      } else {
        // Create new guest (create mutation handles the string-to-array conversion)
        await createGuest({
          company_id: companyId,
          client_id: clientId,
          ...data as any,
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
