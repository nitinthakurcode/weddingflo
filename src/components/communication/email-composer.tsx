'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormSelect } from '@/components/forms';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Eye } from 'lucide-react';

const emailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  template: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailComposerProps {
  defaultTo?: string;
  defaultSubject?: string;
  onSent?: () => void;
}

export function EmailComposer({
  defaultTo,
  defaultSubject,
  onSent,
}: EmailComposerProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: defaultTo || '',
      subject: defaultSubject || '',
      template: '',
      message: '',
    },
  });

  const templateOptions = [
    { value: '', label: 'No Template' },
    { value: 'invite', label: 'Event Invitation' },
    { value: 'reminder', label: 'Event Reminder' },
    { value: 'thank-you', label: 'Thank You Note' },
    { value: 'rsvp-confirmation', label: 'RSVP Confirmation' },
  ];

  const onSubmit = async (data: EmailFormData) => {
    setSending(true);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          html: `<p>${data.message.replace(/\n/g, '<br>')}</p>`,
          text: data.message,
          queue: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast({
        title: 'Email Sent!',
        description: 'Your email has been queued for delivery.',
      });

      form.reset();
      onSent?.();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handlePreview = () => {
    const formData = form.getValues();
    // Open preview in new window
    const previewWindow = window.open('', 'Email Preview', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Email Preview</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="header">
              <p><strong>To:</strong> ${formData.to}</p>
              <p><strong>Subject:</strong> ${formData.subject}</p>
            </div>
            <div class="content">${formData.message.replace(/\n/g, '<br>')}</div>
          </body>
        </html>
      `);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormInput
          control={form.control}
          name="to"
          label="To"
          type="email"
          placeholder="recipient@example.com"
          required
        />

        <FormInput
          control={form.control}
          name="subject"
          label="Subject"
          placeholder="Enter email subject"
          required
        />

        <FormSelect
          control={form.control}
          name="template"
          label="Template (Optional)"
          options={templateOptions}
          placeholder="Choose a template"
        />

        <FormTextarea
          control={form.control}
          name="message"
          label="Message"
          rows={10}
          placeholder="Enter your message..."
          required
        />

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!form.watch('message')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button type="submit" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
