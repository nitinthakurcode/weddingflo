import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface BudgetAlertEmailProps {
  userName: string;
  eventName: string;
  totalBudget: number;
  spentAmount: number;
  remainingAmount: number;
  overageAmount?: number;
  categoryBreakdown?: Array<{
    category: string;
    budget: number;
    spent: number;
    variance: number;
  }>;
  dashboardUrl?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function BudgetAlertEmail({
  userName,
  eventName,
  totalBudget,
  spentAmount,
  remainingAmount,
  overageAmount,
  categoryBreakdown,
  dashboardUrl,
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: BudgetAlertEmailProps) {
  const isOverBudget = overageAmount && overageAmount > 0;
  const percentageSpent = (spentAmount / totalBudget) * 100;

  const preview = isOverBudget
    ? `Budget Alert: Over budget by $${overageAmount.toFixed(2)}`
    : `Budget Alert: ${percentageSpent.toFixed(0)}% of budget spent`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>
        {isOverBudget ? '⚠️ Budget Alert' : '📊 Budget Update'}
      </Heading>

      <Text style={text}>Hi {userName},</Text>

      <Text style={text}>
        {isOverBudget
          ? `We wanted to notify you that your budget for ${eventName} has been exceeded.`
          : `Here's an update on your budget for ${eventName}.`}
      </Text>

      {/* Budget Summary Card */}
      <Section
        style={{
          ...summaryCard,
          backgroundColor: isOverBudget ? '#fee2e2' : '#eff6ff',
          borderColor: isOverBudget ? '#ef4444' : '#3b82f6',
        }}
      >
        <Heading style={h2}>Budget Summary</Heading>
        <Hr style={hr} />

        <Section style={summaryRow}>
          <Text style={summaryLabel}>Total Budget:</Text>
          <Text style={summaryValue}>${totalBudget.toFixed(2)}</Text>
        </Section>

        <Section style={summaryRow}>
          <Text style={summaryLabel}>Amount Spent:</Text>
          <Text style={summaryValue}>${spentAmount.toFixed(2)}</Text>
        </Section>

        {isOverBudget && overageAmount ? (
          <Section style={summaryRow}>
            <Text style={{ ...summaryLabel, color: '#991b1b' }}>Over Budget:</Text>
            <Text style={{ ...summaryValue, color: '#991b1b', fontWeight: 'bold' as const }}>
              ${overageAmount.toFixed(2)}
            </Text>
          </Section>
        ) : (
          <Section style={summaryRow}>
            <Text style={summaryLabel}>Remaining:</Text>
            <Text style={{ ...summaryValue, color: '#16a34a' }}>
              ${remainingAmount.toFixed(2)}
            </Text>
          </Section>
        )}

        {/* Progress Bar */}
        <Section style={progressContainer}>
          <Section
            style={{
              ...progressBar,
              width: `${Math.min(percentageSpent, 100)}%`,
              backgroundColor: isOverBudget ? '#ef4444' : percentageSpent > 80 ? '#f59e0b' : '#22c55e',
            }}
          />
        </Section>
        <Text style={progressText}>
          {percentageSpent.toFixed(1)}% of budget used
        </Text>
      </Section>

      {/* Category Breakdown */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <Section style={breakdownCard}>
          <Heading style={h3}>Category Breakdown</Heading>
          <Hr style={hr} />
          {categoryBreakdown
            .filter((cat) => cat.variance < 0 || cat.spent > cat.budget * 0.8)
            .slice(0, 5)
            .map((category, index) => (
              <Section key={index} style={categoryRow}>
                <Text style={categoryName}>{category.category}</Text>
                <Section style={categoryStats}>
                  <Text style={categoryText}>
                    ${category.spent.toFixed(2)} / ${category.budget.toFixed(2)}
                  </Text>
                  {category.variance < 0 && (
                    <Text style={categoryOverage}>
                      Over by ${Math.abs(category.variance).toFixed(2)}
                    </Text>
                  )}
                </Section>
              </Section>
            ))}
        </Section>
      )}

      {dashboardUrl && (
        <Section style={buttonContainer}>
          <Button
            style={{
              ...button,
              backgroundColor: primaryColor,
            }}
            href={dashboardUrl}
          >
            View Full Budget
          </Button>
        </Section>
      )}

      <Hr style={hr} />

      {isOverBudget ? (
        <Text style={footer}>
          Consider reviewing your expenses and making adjustments where
          possible. Our budget management tools can help you track and optimize
          your spending.
        </Text>
      ) : percentageSpent > 80 ? (
        <Text style={footer}>
          You're approaching your budget limit. Keep an eye on upcoming expenses
          to stay within budget.
        </Text>
      ) : (
        <Text style={footer}>
          You're doing great! Keep tracking your expenses to ensure you stay on
          budget.
        </Text>
      )}
    </EmailLayout>
  );
}

// Styles
const h1 = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const h3 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const summaryCard = {
  border: '2px solid',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const summaryRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  margin: '12px 0',
};

const summaryLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
};

const summaryValue = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: '0',
};

const progressContainer = {
  backgroundColor: '#e5e7eb',
  borderRadius: '9999px',
  height: '16px',
  margin: '16px 0 8px',
  overflow: 'hidden' as const,
};

const progressBar = {
  height: '100%',
  borderRadius: '9999px',
  transition: 'width 0.3s ease',
};

const progressText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
};

const breakdownCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const categoryRow = {
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
};

const categoryName = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const categoryStats = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
};

const categoryText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const categoryOverage = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

export default BudgetAlertEmail;
