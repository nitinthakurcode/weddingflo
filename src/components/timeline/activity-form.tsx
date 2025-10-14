'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { activityFormSchema, ActivityFormValues } from '@/lib/validations/eventFlow.schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { calculateEndTime } from '@/lib/timeline-utils';
import { useEffect } from 'react';

interface ActivityFormProps {
  defaultValues?: Partial<ActivityFormValues>;
  onSubmit: (data: ActivityFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ActivityForm({ defaultValues, onSubmit, isLoading }: ActivityFormProps) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activity_name: '',
      activity_type: 'setup',
      activity_status: 'pending',
      start_time: '10:00',
      duration_minutes: 60,
      vendor_ids: [],
      location: '',
      assigned_to: [],
      dependencies: [],
      time_buffer_minutes: 0,
      color: undefined,
      description: '',
      notes: '',
      ...defaultValues,
    },
  });

  // Auto-calculate end time when start time or duration changes
  const startTime = form.watch('start_time');
  const durationMinutes = form.watch('duration_minutes');

  useEffect(() => {
    if (startTime && durationMinutes) {
      const endTime = calculateEndTime(startTime, durationMinutes);
      // Just for display purposes - we don't store end_time in the form
      console.log('Calculated end time:', endTime);
    }
  }, [startTime, durationMinutes]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>

          <FormField
            control={form.control}
            name="activity_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Setup & Decoration" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="activity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="ceremony">Ceremony</SelectItem>
                      <SelectItem value="reception">Reception</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="cleanup">Cleanup</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activity_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Timing */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Timing</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="60"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>How long this activity takes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time_buffer_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buffer Time (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Extra time after activity</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {startTime && durationMinutes && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
              <span className="font-medium">End Time: </span>
              {calculateEndTime(startTime, durationMinutes)} (including buffer)
            </div>
          )}
        </div>

        {/* Location & Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Location & Assignment</h3>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Main Hall, Garden, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color (optional)</FormLabel>
                <FormControl>
                  <Input type="color" {...field} value={field.value || '#ffffff'} />
                </FormControl>
                <FormDescription>Custom color for timeline visualization</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Details</h3>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of the activity..."
                    className="resize-none"
                    {...field}
                  />
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
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special notes or instructions..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Activity'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
