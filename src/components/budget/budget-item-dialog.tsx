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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BudgetItem, BUDGET_CATEGORIES, PAYMENT_STATUS_LABELS } from '@/types/budget';
import { budgetSchema, BudgetFormData } from '@/lib/validations/budget.schema';
import { useToast } from '@/hooks/use-toast';

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: BudgetItem;
  weddingId: string;
}

export function BudgetItemDialog({
  open,
  onOpenChange,
  item,
  weddingId,
}: BudgetItemDialogProps) {
  const { toast } = useToast();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const createBudgetItem = useMutation({
    mutationFn: async (data: any) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data: result, error } = await supabase
        .from('budget_items')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-items', weddingId] });
    },
  });

  const updateBudgetItem = useMutation({
    mutationFn: async ({ budgetItemId, ...data }: any) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data: result, error } = await supabase
        .from('budget_items')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .update(data)
        .eq('id', budgetItemId)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-items', weddingId] });
    },
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: 'other',
      item_name: '',
      description: '',
      budget: 0,
      actual_cost: 0,
      paid_amount: 0,
      payment_status: 'unpaid',
      due_date: '',
      paid_date: '',
      notes: '',
    },
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (item) {
      form.reset({
        category: item.category,
        item_name: item.item_name,
        description: item.description || '',
        budget: item.budget,
        actual_cost: item.actual_cost,
        paid_amount: item.paid_amount,
        payment_status: item.payment_status,
        due_date: item.due_date || '',
        paid_date: item.paid_date || '',
        notes: item.notes || '',
      });
    } else {
      form.reset({
        category: 'other',
        item_name: '',
        description: '',
        budget: 0,
        actual_cost: 0,
        paid_amount: 0,
        payment_status: 'unpaid',
        due_date: '',
        paid_date: '',
        notes: '',
      });
    }
  }, [item, open, form]);

  const onSubmit = async (data: BudgetFormData) => {
    try {
      if (item) {
        // Update existing item
        await updateBudgetItem.mutateAsync({
          budgetItemId: item.id,
          ...data,
          vendor_id: data.vendor_id || null,
        });
        toast({
          title: 'Success',
          description: 'Budget item updated successfully',
        });
      } else {
        // Create new item
        await createBudgetItem.mutateAsync({
          wedding_id: weddingId,
          ...data,
          vendor_id: data.vendor_id || null,
        });
        toast({
          title: 'Success',
          description: 'Budget item created successfully',
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: item
          ? 'Failed to update budget item'
          : 'Failed to create budget item',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Budget Item' : 'Add Budget Item'}</DialogTitle>
          <DialogDescription>
            {item
              ? 'Update the details of this budget item'
              : 'Add a new item to your wedding budget'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BUDGET_CATEGORIES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="item_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Wedding venue rental" {...field} />
                    </FormControl>
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this item"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes" {...field} />
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
                  : item
                    ? 'Update Item'
                    : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
