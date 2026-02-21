import {
  Heading,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface BudgetAlertEmailProps {
  recipientName: string;
  coupleName: string;
  category: string;
  budgeted: string;
  spent: string;
  percentUsed: number;
  locale?: string;
}

export function BudgetAlertEmail({
  recipientName,
  coupleName,
  category,
  budgeted,
  spent,
  percentUsed,
  locale = 'en',
}: BudgetAlertEmailProps) {
  const isOverBudget = percentUsed > 100;

  return (
    <BaseEmail
      preview={`Budget Alert: ${category} is ${isOverBudget ? 'over budget' : 'approaching limit'}`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Budget Alert
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        This is an automatic alert regarding the budget for {coupleName}&apos;s wedding.
      </Text>
      <Section
        className={`p-4 rounded-lg mb-4 ${
          isOverBudget ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          {category}
        </Text>
        <Text className="text-gray-600 mb-1">
          Budgeted: {budgeted}
        </Text>
        <Text className="text-gray-600 mb-1">
          Spent: {spent}
        </Text>
        <Text
          className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-amber-600'}`}
        >
          {percentUsed.toFixed(0)}% of budget used
        </Text>
      </Section>
      <Text className="text-gray-600">
        {isOverBudget
          ? 'This category has exceeded its budget. Please review and adjust as needed.'
          : 'This category is approaching its budget limit. Consider reviewing upcoming expenses.'}
      </Text>
    </BaseEmail>
  );
}
