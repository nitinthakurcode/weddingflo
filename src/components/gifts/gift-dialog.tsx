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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { giftSchema, type GiftFormData } from '@/lib/validations/gift.schema';

interface Gift {
  id: string;
  giftName: string;
  fromName?: string | null;
  fromEmail?: string | null;
  deliveryDate?: string | null;
  deliveryStatus?: string | null;
  thankYouSent?: boolean | null;
  thankYouSentDate?: string | null;
  notes?: string | null;
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
    },
  });

  const updateGift = trpc.gifts.update.useMutation({
    onSuccess: () => {
      utils.gifts.getAll.invalidate({ clientId });
    },
  });

  const form = useForm<GiftFormData>({
    resolver: zodResolver(giftSchema),
    defaultValues: {
      giftName: '',
      fromName: '',
      fromEmail: '',
      deliveryDate: '',
      deliveryStatus: 'pending',
      thankYouSent: false,
      thankYouSentDate: '',
      notes: '',
    },
  });

  // Update form when gift changes
  useEffect(() => {
    if (gift) {
      form.reset({
        giftName: gift.giftName || '',
        fromName: gift.fromName || '',
        fromEmail: gift.fromEmail || '',
        deliveryDate: gift.deliveryDate || '',
        deliveryStatus: (gift.deliveryStatus as GiftFormData['deliveryStatus']) || 'pending',
        thankYouSent: gift.thankYouSent || false,
        thankYouSentDate: gift.thankYouSentDate ? new Date(gift.thankYouSentDate).toISOString().split('T')[0] : '',
        notes: gift.notes || '',
      });
    } else {
      form.reset({
        giftName: '',
        fromName: '',
        fromEmail: '',
        deliveryDate: '',
        deliveryStatus: 'pending',
        thankYouSent: false,
        thankYouSentDate: '',
        notes: '',
      });
    }
  }, [gift, form, open]);

  const onSubmit = async (data: GiftFormData) => {
    try {
      if (gift) {
        // Update existing gift - use correct router structure
        await updateGift.mutateAsync({
          id: gift.id,
          data: {
            giftName: data.giftName,
            fromName: data.fromName || undefined,
            fromEmail: data.fromEmail || undefined,
            deliveryDate: data.deliveryDate || undefined,
            deliveryStatus: data.deliveryStatus,
            thankYouSent: data.thankYouSent,
            thankYouSentDate: data.thankYouSentDate || undefined,
            notes: data.notes || undefined,
          },
        });
        toast({
          title: 'Success',
          description: 'Gift updated successfully',
        });
      } else {
        // Create new gift
        await createGift.mutateAsync({
          clientId,
          giftName: data.giftName,
          fromName: data.fromName || undefined,
          fromEmail: data.fromEmail || undefined,
          deliveryDate: data.deliveryDate || undefined,
          deliveryStatus: data.deliveryStatus,
          notes: data.notes || undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              name="giftName"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From (Name)</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From (Email)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Status</FormLabel>
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
            </div>

            {gift && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <FormField
                  control={form.control}
                  name="thankYouSent"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Thank You Sent</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thankYouSentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thank You Sent Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the gift..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
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
