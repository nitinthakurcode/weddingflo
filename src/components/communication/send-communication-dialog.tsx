'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Mail, MessageSquare, Phone } from 'lucide-react';

const messageSchema = z.object({
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  template: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface SendCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}

export function SendCommunicationDialog({
  open,
  onOpenChange,
  guestName,
  guestEmail,
  guestPhone,
}: SendCommunicationDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('email');

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: '',
      message: '',
      template: 'none',
    },
  });

  const emailTemplateOptions = [
    { value: 'none', label: 'No Template' },
    { value: 'invite-email', label: 'Event Invitation' },
    { value: 'reminder-email', label: 'Event Reminder' },
    { value: 'thank-you-email', label: 'Thank You Note' },
  ];

  const handleEmailSend = async (data: MessageFormData) => {
    if (!guestEmail) {
      toast({
        title: 'Error',
        description: 'Guest email not available',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      // Build email payload
      const emailPayload: any = {
        to: guestEmail,
        subject: data.subject || `Message from WeddingFlow`,
        html: `<p>${data.message.replace(/\n/g, '<br>')}</p>`,
        text: data.message,
        queue: true,
      };

      // Only include template if one is selected (not "none")
      if (data.template && data.template !== 'none') {
        emailPayload.template = data.template;
      }

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast({
        title: 'Email Sent!',
        description: `Email to ${guestName} has been queued for delivery.`,
      });

      form.reset({
        subject: '',
        message: '',
        template: 'none',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSMSSend = async (data: MessageFormData) => {
    if (!guestPhone) {
      toast({
        title: 'Error',
        description: 'Guest phone number not available',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: guestPhone,
          message: data.message,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      toast({
        title: 'SMS Sent!',
        description: `SMS to ${guestName} has been sent successfully.`,
      });

      form.reset({
        subject: '',
        message: '',
        template: 'none',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send SMS',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppSend = () => {
    if (!guestPhone) {
      toast({
        title: 'Error',
        description: 'Guest phone number not available',
        variant: 'destructive',
      });
      return;
    }

    const message = form.getValues('message');
    if (!message) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    // Format phone number for WhatsApp (remove non-digits)
    const phoneNumber = guestPhone.replace(/\D/g, '');

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: 'WhatsApp Opened',
      description: 'WhatsApp has been opened in a new tab',
    });
  };

  const onSubmit = async (data: MessageFormData) => {
    if (activeTab === 'email') {
      await handleEmailSend(data);
    } else if (activeTab === 'sms') {
      await handleSMSSend(data);
    } else if (activeTab === 'whatsapp') {
      handleWhatsAppSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Message to {guestName}</DialogTitle>
          <DialogDescription>
            Send an email, SMS, or WhatsApp message to your guest
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" disabled={!guestEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" disabled={!guestPhone}>
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" disabled={!guestPhone}>
              <Phone className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <TabsContent value="email" className="space-y-4 mt-0">
              {!guestEmail ? (
                <div className="text-center py-8 text-muted-foreground">
                  No email address available for this guest
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    To: {guestEmail}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject"
                      {...form.register('subject')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template">Template (Optional)</Label>
                    <Select
                      value={form.watch('template') || 'none'}
                      onValueChange={(value) => form.setValue('template', value)}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplateOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-message">Message</Label>
                    <Textarea
                      id="email-message"
                      rows={8}
                      placeholder="Enter your message..."
                      {...form.register('message')}
                    />
                    {form.formState.errors.message && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.message.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-0">
              {!guestPhone ? (
                <div className="text-center py-8 text-muted-foreground">
                  No phone number available for this guest
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    To: {guestPhone}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-message">Message</Label>
                    <Textarea
                      id="sms-message"
                      rows={8}
                      placeholder="Enter your SMS message (max 1600 characters)..."
                      {...form.register('message')}
                    />
                    {form.formState.errors.message && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.message.message}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    SMS messages are limited to 1600 characters
                  </p>
                </>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-0">
              {!guestPhone ? (
                <div className="text-center py-8 text-muted-foreground">
                  No phone number available for this guest
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    To: {guestPhone}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-message">Message</Label>
                    <Textarea
                      id="whatsapp-message"
                      rows={8}
                      placeholder="Enter your WhatsApp message..."
                      {...form.register('message')}
                    />
                    {form.formState.errors.message && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.message.message}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    This will open WhatsApp Web with the message pre-filled
                  </p>
                </>
              )}
            </TabsContent>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={sending || (activeTab === 'email' && !guestEmail) || ((activeTab === 'sms' || activeTab === 'whatsapp') && !guestPhone)}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {activeTab === 'whatsapp' ? 'Open WhatsApp' : `Send ${activeTab === 'email' ? 'Email' : 'SMS'}`}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
