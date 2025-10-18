'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
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
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const createGuest = useMutation({
    mutationFn: async (data: any) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data: result, error } = await supabase
        .from('guests')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', clientId] });
    },
  });

  const updateGuest = useMutation({
    mutationFn: async ({ guestId, ...data }: any) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data: result, error } = await supabase
        .from('guests')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .update(data)
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', clientId] });
    },
  });

  const handleSubmit = async (data: GuestFormValues) => {
    try {
      setIsLoading(true);

      if (guest) {
        // Update existing guest
        const { dietary_restrictions, seating_preference, ...rest } = data;

        await updateGuest.mutateAsync({
          guestId: guest.id,
          ...rest,
          dietary_restrictions: dietary_restrictions ? [dietary_restrictions] : [],
          seating_preferences: seating_preference ? [seating_preference] : [],
        });
        toast({
          title: 'Success',
          description: 'Guest updated successfully',
        });
      } else {
        // Create new guest
        await createGuest.mutateAsync({
          company_id: companyId,
          client_id: clientId,
          ...data,
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
