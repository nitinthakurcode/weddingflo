'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail,
  CreditCard,
  Calendar,
  Users,
  Cloud,
  MessageSquare,
  Plug
} from 'lucide-react';

const INTEGRATIONS = [
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Send email campaigns and manage subscriber lists',
    category: 'Email Marketing',
    icon: Mail,
    status: 'coming_soon',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Reliable email delivery for transactional and marketing emails',
    category: 'Email Marketing',
    icon: Mail,
    status: 'coming_soon',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments and manage billing',
    category: 'Payments',
    icon: CreditCard,
    status: 'coming_soon',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Accept payments via PayPal',
    category: 'Payments',
    icon: CreditCard,
    status: 'coming_soon',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync events and schedules with Google Calendar',
    category: 'Calendar',
    icon: Calendar,
    status: 'coming_soon',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Sync with Outlook calendar and contacts',
    category: 'Calendar',
    icon: Calendar,
    status: 'coming_soon',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts and leads with Salesforce CRM',
    category: 'CRM',
    icon: Users,
    status: 'coming_soon',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Connect with HubSpot CRM and marketing tools',
    category: 'CRM',
    icon: Users,
    status: 'coming_soon',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Store and share files on Google Drive',
    category: 'Storage',
    icon: Cloud,
    status: 'coming_soon',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Sync files with Dropbox cloud storage',
    category: 'Storage',
    icon: Cloud,
    status: 'coming_soon',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates in Slack',
    category: 'Communication',
    icon: MessageSquare,
    status: 'coming_soon',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Integrate with Microsoft Teams for collaboration',
    category: 'Communication',
    icon: MessageSquare,
    status: 'coming_soon',
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services and tools to enhance your workflow
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;

          return (
            <Card key={integration.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                  <Button size="sm" variant="ghost" disabled>
                    <Plug className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need a Custom Integration?</CardTitle>
          <CardDescription>
            Don&apos;t see the integration you need? Let us know and we&apos;ll consider adding it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            Request Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
