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
import {
  CreativeJob,
  CREATIVE_TYPES,
  CREATIVE_STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/types/creative';
import { creativeSchema, CreativeFormData } from '@/lib/validations/creative.schema';
import { useToast } from '@/hooks/use-toast';

interface CreativeJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: CreativeJob;
  weddingId: string;
}

export function CreativeJobDialog({
  open,
  onOpenChange,
  job,
  weddingId,
}: CreativeJobDialogProps) {
  const { toast } = useToast();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const createCreativeJob = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('creative_jobs')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative-jobs', weddingId] });
    },
  });

  const updateCreativeJob = useMutation({
    mutationFn: async ({ jobId, ...data }: any) => {
      const { data: result, error } = await supabase
        .from('creative_jobs')
        .update(data)
        .eq('id', jobId)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative-jobs', weddingId] });
    },
  });

  const form = useForm<CreativeFormData>({
    resolver: zodResolver(creativeSchema),
    defaultValues: {
      type: 'invitation',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assigned_to: '',
      due_date: '',
      budget: undefined,
      actual_cost: undefined,
      feedback: '',
      notes: '',
    },
  });

  // Reset form when job changes or dialog opens
  useEffect(() => {
    if (job) {
      form.reset({
        type: job.type,
        title: job.title,
        description: job.description || '',
        status: job.status,
        priority: job.priority,
        assigned_to: job.assigned_to || '',
        due_date: job.due_date || '',
        budget: job.budget,
        actual_cost: job.actual_cost,
        feedback: job.feedback || '',
        notes: job.notes || '',
      });
    } else {
      form.reset({
        type: 'invitation',
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
        budget: undefined,
        actual_cost: undefined,
        feedback: '',
        notes: '',
      });
    }
  }, [job, open, form]);

  const onSubmit = async (data: CreativeFormData) => {
    try {
      if (job) {
        // Update existing job
        await updateCreativeJob.mutateAsync({
          jobId: job.id,
          ...data,
          vendor_id: data.vendor_id || null,
        });
        toast({
          title: 'Success',
          description: 'Creative project updated successfully',
        });
      } else {
        // Create new job
        await createCreativeJob.mutateAsync({
          wedding_id: weddingId,
          ...data,
          vendor_id: data.vendor_id || null,
        });
        toast({
          title: 'Success',
          description: 'Creative project created successfully',
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: job
          ? 'Failed to update creative project'
          : 'Failed to create creative project',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {job ? 'Edit Creative Project' : 'Add Creative Project'}
          </DialogTitle>
          <DialogDescription>
            {job
              ? 'Update the details of this creative project'
              : 'Add a new creative project to your wedding'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CREATIVE_TYPES).map(([value, label]) => (
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Wedding invitation design" {...field} />
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
                      placeholder="Additional details about this project"
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
                        {Object.entries(CREATIVE_STATUS_LABELS).map(([value, label]) => (
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Team member name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
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
                      <FormLabel>Actual Cost (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Client or reviewer feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  : job
                    ? 'Update Project'
                    : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
