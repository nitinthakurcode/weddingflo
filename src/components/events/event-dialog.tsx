'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EventForm } from './event-form';
import { EventFormValues } from '@/lib/validations/event.schema';
import { Event } from '@/types/event';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
  onSubmit: (data: EventFormValues) => Promise<void>;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
}: EventDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: EventFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          <DialogDescription>
            {event
              ? 'Update the event information below.'
              : 'Fill in the event details to add a new event to your wedding.'}
          </DialogDescription>
        </DialogHeader>
        <EventForm
          defaultValues={event}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
