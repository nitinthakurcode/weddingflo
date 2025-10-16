'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { giftSchema, type GiftFormData } from '@/lib/validations/gift.schema';

interface Gift {
  id: string;
  guestName: string;
  description: string;
  category?: string;
  estimatedValue?: number;
  receivedDate: string;
  deliveryStatus: 'pending' | 'in_transit' | 'delivered' | 'returned';
  thankYouStatus: 'not_sent' | 'draft' | 'sent';
  notes?: string;
}

interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift?: Gift;
  weddingId: string;
}

export function GiftDialog({
  open,
  onOpenChange,
  gift,
  weddingId,
}: GiftDialogProps) {
  const { toast } = useToast();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const createGift = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('gifts')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts', weddingId] });
    },
  });

  const updateGift = useMutation({
    mutationFn: async ({ giftId, ...data }: any) => {
      const { data: result, error } = await supabase
        .from('gifts')
        .update(data)
        .eq('id', giftId)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts', weddingId] });
    },
  });

  const form = useForm<GiftFormData>({
    resolver: zodResolver(giftSchema),
    defaultValues: {
      guestName: '',
      description: '',
      category: '',
      estimatedValue: 0,
      receivedDate: new Date().toISOString().split('T')[0],
      deliveryStatus: 'pending',
      deliveryTrackingNumber: '',
      deliveryNotes: '',
      thankYouStatus: 'not_sent',
      thankYouSentDate: '',
      thankYouNotes: '',
      tags: [],
      notes: '',
    },
  });

  // Update form when gift changes
  useEffect(() => {
    if (gift) {
      form.reset({
        guestName: gift.guestName,
        description: gift.description,
        category: gift.category || '',
        estimatedValue: gift.estimatedValue || 0,
        receivedDate: gift.receivedDate,
        deliveryStatus: gift.deliveryStatus,
        thankYouStatus: gift.thankYouStatus,
        notes: gift.notes || '',
      });
    } else {
      form.reset({
        guestName: '',
        description: '',
        category: '',
        estimatedValue: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'pending',
        thankYouStatus: 'not_sent',
        notes: '',
      });
    }
  }, [gift, form]);

  const onSubmit = async (data: GiftFormData) => {
    try {
      if (gift) {
        // Update existing gift
        await updateGift.mutateAsync({
          giftId: gift.id,
          guestName: data.guestName,
          description: data.description,
          category: data.category,
          estimatedValue: data.estimatedValue,
          receivedDate: data.receivedDate,
          deliveryStatus: data.deliveryStatus,
          thankYouStatus: data.thankYouStatus,
          notes: data.notes,
        });
        toast({
          title: 'Success',
          description: 'Gift updated successfully',
        });
      } else {
        // Create new gift
        await createGift.mutateAsync({
          wedding_id: weddingId,
          guestName: data.guestName,
          description: data.description,
          category: data.category,
          estimatedValue: data.estimatedValue,
          receivedDate: data.receivedDate,
          deliveryStatus: data.deliveryStatus,
          thankYouStatus: data.thankYouStatus,
          notes: data.notes,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="home_decor">Home Decor</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="bedding">Bedding</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gift_card">Gift Card</SelectItem>
                        <SelectItem value="experience">Experience</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
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
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deliveryStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thankYouStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thank You Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="not_sent">Not Sent</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the gift..."
                      className="min-h-[100px]"
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
