'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('communication');
  const tCommon = useTranslations('common');
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
        clientId: data.clientId && data.clientId !== '__none__' ? data.clientId : undefined,
        toNumber: data.toNumber,
        message: data.message,
      });

      toast.success(t('whatsappSent'), {
        description: `${t('messageId')}: ${result.messageId}`,
      });

      form.reset();
      setCharCount(0);
    } catch (error: any) {
      toast.error(t('whatsappFailed'), {
        description: error.message || t('tryAgain'),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sendWhatsApp')}</CardTitle>
        <CardDescription>{t('sendWhatsAppDescription')}</CardDescription>
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
                  <FormLabel>{t('clientOptional')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectClient')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t('noneManual')}</SelectItem>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.partner1FirstName}{client.partner1LastName && ` ${client.partner1LastName}`}
                          {client.partner2FirstName && ` & ${client.partner2FirstName}`}{client.partner2LastName && ` ${client.partner2LastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('clientAutoFillDescription')}
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
                  <FormLabel>{t('phoneNumber')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1234567890"
                      {...field}
                      disabled={sendMessage.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('includeCountryCode')}
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
                  <FormLabel>{t('message')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('enterMessage')}
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
                    {t('characters', { count: charCount, max: 1600 })}
                    {charCount > 1600 && (
                      <span className="text-rose-600 ml-2">{t('messageTooLong')}</span>
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
                  {tCommon('saving')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('sendWhatsApp')}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
