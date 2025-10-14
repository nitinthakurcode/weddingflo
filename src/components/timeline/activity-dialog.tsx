'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ActivityForm } from './activity-form';
import { ActivityFormValues } from '@/lib/validations/eventFlow.schema';
import { EventActivity } from '@/types/eventFlow';

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: EventActivity;
  onSubmit: (data: ActivityFormValues) => Promise<void>;
}

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  onSubmit,
}: ActivityDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ActivityFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Edit Activity' : 'Add New Activity'}
          </DialogTitle>
          <DialogDescription>
            {activity
              ? 'Update the activity details below.'
              : 'Fill in the activity details to add it to your timeline.'}
          </DialogDescription>
        </DialogHeader>
        <ActivityForm
          defaultValues={activity as any}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
