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
import { BUDGET_CATEGORIES } from '@/types/budget';
import { budgetSchema, BudgetFormData } from '@/lib/validations/budget.schema';
import { useToast } from '@/hooks/use-toast';

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: {
    id: string;
    category: string;
    item?: string;
    expenseDetails?: string | null;
    estimatedCost?: string | null;
    actualCost?: string | null;
    vendorId?: string | null;
    eventId?: string | null;
    paymentStatus?: string | null;
    transactionDate?: string | null;
    paymentDate?: Date | null;
    notes?: string | null;
    clientVisible?: boolean;
  };
  clientId: string;
}

const PAYMENT_STATUS_OPTIONS = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function BudgetItemDialog({
  open,
  onOpenChange,
  item,
  clientId,
}: BudgetItemDialogProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const createBudgetItem = trpc.budget.create.useMutation({
    onSuccess: () => {
      utils.budget.getAll.invalidate({ clientId });
    },
  });

  const updateBudgetItem = trpc.budget.update.useMutation({
    onSuccess: () => {
      utils.budget.getAll.invalidate({ clientId });
    },
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: 'other',
      itemName: '',
      expenseDetails: '',
      estimatedCost: 0,
      actualCost: 0,
      paymentStatus: 'pending',
      transactionDate: '',
      paymentDate: '',
      notes: '',
      clientVisible: true,
    },
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (item) {
      form.reset({
        category: item.category as BudgetFormData['category'],
        itemName: item.item || '',
        expenseDetails: item.expenseDetails || '',
        estimatedCost: parseFloat(item.estimatedCost || '0'),
        actualCost: parseFloat(item.actualCost || '0'),
        vendorId: item.vendorId || undefined,
        eventId: item.eventId || undefined,
        paymentStatus: (item.paymentStatus as BudgetFormData['paymentStatus']) || 'pending',
        transactionDate: item.transactionDate || '',
        paymentDate: item.paymentDate ? new Date(item.paymentDate).toISOString().split('T')[0] : '',
        notes: item.notes || '',
        clientVisible: item.clientVisible ?? true,
      });
    } else {
      form.reset({
        category: 'other',
        itemName: '',
        expenseDetails: '',
        estimatedCost: 0,
        actualCost: 0,
        paymentStatus: 'pending',
        transactionDate: '',
        paymentDate: '',
        notes: '',
        clientVisible: true,
      });
    }
  }, [item, open, form]);

  const onSubmit = async (data: BudgetFormData) => {
    try {
      if (item) {
        // Update existing item - correctly structure for router
        await updateBudgetItem.mutateAsync({
          id: item.id,
          data: {
            category: data.category,
            itemName: data.itemName,
            expenseDetails: data.expenseDetails,
            estimatedCost: data.estimatedCost,
            actualCost: data.actualCost,
            vendorId: data.vendorId || null,
            eventId: data.eventId || null,
            paymentStatus: data.paymentStatus,
            transactionDate: data.transactionDate || null,
            paymentDate: data.paymentDate || null,
            notes: data.notes,
            clientVisible: data.clientVisible,
          },
        });
        toast({
          title: 'Success',
          description: 'Budget item updated successfully',
        });
      } else {
        // Create new item - correctly structure for router
        await createBudgetItem.mutateAsync({
          clientId,
          category: data.category,
          itemName: data.itemName,
          expenseDetails: data.expenseDetails,
          estimatedCost: data.estimatedCost,
          actualCost: data.actualCost,
          vendorId: data.vendorId,
          eventId: data.eventId,
          paymentStatus: data.paymentStatus,
          transactionDate: data.transactionDate,
          paymentDate: data.paymentDate,
          notes: data.notes,
          clientVisible: data.clientVisible,
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
                name="itemName"
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
              name="expenseDetails"
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost</FormLabel>
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
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Cost (Optional)</FormLabel>
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="paymentStatus"
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
                        {Object.entries(PAYMENT_STATUS_OPTIONS).map(([value, label]) => (
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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date (Optional)</FormLabel>
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
