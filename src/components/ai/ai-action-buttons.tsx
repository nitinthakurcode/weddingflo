'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, DollarSign, Calendar, Mail } from 'lucide-react';

interface AIActionButtonsProps {
  onAction: (action: string, prompt: string) => void;
}

export function AIActionButtons({ onAction }: AIActionButtonsProps) {
  const quickActions = [
    {
      icon: Users,
      label: 'Optimize Seating',
      prompt: 'Can you help me optimize the seating arrangements for my guests?',
      color: 'text-blue-600',
    },
    {
      icon: DollarSign,
      label: 'Budget Analysis',
      prompt: 'Please analyze my budget and predict the final costs.',
      color: 'text-green-600',
    },
    {
      icon: Calendar,
      label: 'Check Timeline',
      prompt: 'Review my timeline and check for any conflicts or issues.',
      color: 'text-purple-600',
    },
    {
      icon: Mail,
      label: 'Draft Email',
      prompt: 'Help me draft an email to send to my guests.',
      color: 'text-orange-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common tasks the AI can help with</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => onAction(action.label, action.prompt)}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
