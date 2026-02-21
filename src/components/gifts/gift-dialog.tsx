'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { giftSchema, type GiftFormData } from '@/lib/validations/gift.schema';

interface Gift {
  id: string;
  name: string;
  value?: number | null;
  status?: string | null;
}

interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift?: Gift;
  clientId: string;
}

export function GiftDialog({
  open,
  onOpenChange,
  gift,
  clientId,
}: GiftDialogProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const createGift = trpc.gifts.create.useMutation({
    onSuccess: () => {
      utils.gifts.getAll.invalidate({ clientId });
      utils.gifts.getStats.invalidate({ clientId });
    },
  });

  const updateGift = trpc.gifts.update.useMutation({
    onSuccess: () => {
      utils.gifts.getAll.invalidate({ clientId });
      utils.gifts.getStats.invalidate({ clientId });
    },
  });

  const form = useForm<GiftFormData>({
    resolver: zodResolver(giftSchema),
    defaultValues: {
      name: '',
      value: '',
      status: 'received',
    },
  });

  // Update form when gift changes
  useEffect(() => {
    if (gift) {
      form.reset({
        name: gift.name || '',
        value: gift.value?.toString() || '',
        status: (gift.status as GiftFormData['status']) || 'received',
      });
    } else {
      form.reset({
        name: '',
        value: '',
        status: 'received',
      });
    }
  }, [gift, form, open]);

  const onSubmit = async (data: GiftFormData) => {
    try {
      if (gift) {
        await updateGift.mutateAsync({
          id: gift.id,
          name: data.name,
          value: data.value ? parseFloat(data.value) : undefined,
          status: data.status,
        });
        toast({
          title: 'Success',
          description: 'Gift updated successfully',
        });
      } else {
        await createGift.mutateAsync({
          clientId,
          name: data.name,
          value: data.value ? parseFloat(data.value) : undefined,
          status: data.status,
        });
        toast({
          title: 'Success',
          description: 'Gift added successfully',
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: gift ? 'Failed to update gift' : 'Failed to add gift',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{gift ? 'Edit Gift' : 'Add New Gift'}</DialogTitle>
          <DialogDescription>
            {gift
              ? 'Update the gift details below.'
              : 'Enter the gift details below. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gift Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Crystal vase set" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : gift
                    ? 'Update Gift'
                    : 'Add Gift'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
