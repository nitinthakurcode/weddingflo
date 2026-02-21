import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface TaskReminderEmailProps {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  clientName?: string;
  eventName?: string;
  taskUrl: string;
  locale?: string;
}

export function TaskReminderEmail({
  recipientName,
  taskTitle,
  taskDescription,
  dueDate,
  priority,
  clientName,
  eventName,
  taskUrl,
  locale = 'en',
}: TaskReminderEmailProps) {
  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      default:
        return 'bg-green-100 border-green-200 text-green-800';
    }
  };

  return (
    <BaseEmail
      preview={`Task Reminder: ${taskTitle} due ${dueDate}`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Task Reminder
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        This is a reminder about an upcoming task that needs your attention.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          {taskTitle}
        </Text>
        {taskDescription && (
          <Text className="text-gray-600 mb-2">
            {taskDescription}
          </Text>
        )}
        <Text className="text-gray-600 mb-1">
          <strong>Due:</strong> {dueDate}
        </Text>
        <Text className={`inline-block px-2 py-1 rounded text-sm ${getPriorityColor()}`}>
          {priority.toUpperCase()} Priority
        </Text>
        {(clientName || eventName) && (
          <Section className="mt-3 pt-3 border-t">
            {clientName && (
              <Text className="text-gray-600 mb-1">
                <strong>Client:</strong> {clientName}
              </Text>
            )}
            {eventName && (
              <Text className="text-gray-600">
                <strong>Event:</strong> {eventName}
              </Text>
            )}
          </Section>
        )}
      </Section>
      <Section className="text-center">
        <Link
          href={taskUrl}
          className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
        >
          View Task
        </Link>
      </Section>
    </BaseEmail>
  );
}
