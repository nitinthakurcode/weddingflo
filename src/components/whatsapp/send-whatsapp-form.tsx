'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const whatsappFormSchema = z.object({
  clientId: z.string().optional(),
  toNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message must be less than 1600 characters'),
});

type WhatsAppFormValues = z.infer<typeof whatsappFormSchema>;

export function SendWhatsAppForm() {
  const [charCount, setCharCount] = useState(0);
  const { data: clients } = trpc.clients.list.useQuery({});
  const sendMessage = trpc.whatsapp.sendMessage.useMutation();

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappFormSchema),
    defaultValues: {
      clientId: '',
      toNumber: '',
      message: '',
    },
  });

  const onSubmit = async (data: WhatsAppFormValues) => {
    try {
      const result = await sendMessage.mutateAsync({
        clientId: data.clientId || undefined,
        toNumber: data.toNumber,
        message: data.message,
      });

      toast.success('WhatsApp message sent successfully!', {
        description: `Message ID: ${result.messageId}`,
      });

      form.reset();
      setCharCount(0);
    } catch (error: any) {
      toast.error('Failed to send WhatsApp message', {
        description: error.message || 'Please try again',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send WhatsApp Message</CardTitle>
        <CardDescription>Send a WhatsApp message to your client or any phone number</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Selection (Optional) */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None (enter number manually)</SelectItem>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.partner1_first_name} {client.partner1_last_name} & {client.partner2_first_name} {client.partner2_last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a client to auto-fill their phone number, or enter manually
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="toNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1234567890"
                      {...field}
                      disabled={sendMessage.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Include country code (e.g., +1 for US, +91 for India)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your WhatsApp message..."
                      className="min-h-[120px]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setCharCount(e.target.value.length);
                      }}
                      disabled={sendMessage.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {charCount}/1600 characters
                    {charCount > 1600 && (
                      <span className="text-red-600 ml-2">Message too long!</span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={sendMessage.isPending || charCount > 1600}
            >
              {sendMessage.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send WhatsApp Message
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
