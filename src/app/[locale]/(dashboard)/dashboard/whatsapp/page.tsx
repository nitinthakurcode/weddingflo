'use client';

import { trpc } from '@/lib/trpc/client';
import { SendWhatsAppForm } from '@/components/whatsapp/send-whatsapp-form';
import { WhatsAppStatsCards } from '@/components/whatsapp/whatsapp-stats-cards';
import { WhatsAppLogsTable } from '@/components/whatsapp/whatsapp-logs-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, BarChart3, Send, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function WhatsAppPage() {
  const { data: stats, isLoading: statsLoading } = trpc.whatsapp.getStats.useQuery({
    days: 30,
  });

  const defaultStats = {
    total_sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    delivery_rate: 0,
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Business</h2>
          <p className="text-muted-foreground">
            Send WhatsApp messages to your clients and track delivery
          </p>
        </div>
      </div>

      {/* Setup Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>WhatsApp Setup Required</AlertTitle>
        <AlertDescription>
          To send WhatsApp messages, you need to configure your Twilio WhatsApp Business number.
          Add <code className="font-mono text-sm">TWILIO_WHATSAPP_NUMBER</code> to your environment variables.
          <br />
          Format: <code className="font-mono text-sm">whatsapp:+14155238886</code>
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <WhatsAppStatsCards stats={stats || defaultStats} isLoading={statsLoading} />

      {/* Tabs */}
      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Message
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Message History
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Information
          </TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SendWhatsAppForm />
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Tips</CardTitle>
                <CardDescription>Best practices for WhatsApp messaging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📱 Phone Number Format</h4>
                  <p className="text-sm text-muted-foreground">
                    Always include the country code (e.g., +1 for US, +91 for India). Example: +1234567890
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">✅ Message Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp messages are limited to 1,600 characters. Keep your messages concise.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🔔 Opt-in Required</h4>
                  <p className="text-sm text-muted-foreground">
                    Users must opt-in to receive WhatsApp messages. Make sure you have permission.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">⏰ Response Time</h4>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp messages are usually delivered instantly, but can take up to a few minutes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">💰 Pricing</h4>
                  <p className="text-sm text-muted-foreground">
                    Twilio charges per WhatsApp message. Check your Twilio console for current rates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <WhatsAppLogsTable />
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business API</CardTitle>
                <CardDescription>Features and capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Rich Media Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Send images, videos, documents, and location data alongside text messages.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Two-Way Messaging</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive and respond to messages from your clients in real-time.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Message Templates</h4>
                  <p className="text-sm text-muted-foreground">
                    Create pre-approved message templates for common scenarios.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Delivery Receipts</h4>
                  <p className="text-sm text-muted-foreground">
                    Track when messages are sent, delivered, and read by recipients.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions</CardTitle>
                <CardDescription>How to configure WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">1. Twilio Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a Twilio account and enable WhatsApp Business API.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. WhatsApp Number</h4>
                  <p className="text-sm text-muted-foreground">
                    Request a WhatsApp-enabled phone number from Twilio.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Environment Variables</h4>
                  <p className="text-sm text-muted-foreground">
                    Add TWILIO_WHATSAPP_NUMBER to your .env.local file.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">4. Test Messages</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the Twilio sandbox to test messages before going live.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">5. Go Live</h4>
                  <p className="text-sm text-muted-foreground">
                    Submit your business profile for approval to send to real numbers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
