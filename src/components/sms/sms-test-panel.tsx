'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Send } from 'lucide-react';

export function SmsTestPanel() {
  const t = useTranslations('smsTest');
  const [phone, setPhone] = useState('');
  const [templateType, setTemplateType] = useState<'wedding_reminder' | 'rsvp_confirmation' | 'payment_reminder'>('wedding_reminder');
  const [locale, setLocale] = useState<'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi'>('en');
  const [isSending, setIsSending] = useState(false);

  const sendTestMutation = trpc.sms.sendTestSms.useMutation({
    onSuccess: (data) => {
      toast.success(t('successMessage'));
      setIsSending(false);
    },
    onError: (error) => {
      toast.error(t('errorMessage'));
      setIsSending(false);
    },
  });

  const handleSendTest = async () => {
    if (!phone) {
      toast.error(t('phoneRequired'));
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      toast.error(t('invalidPhone'));
      return;
    }

    setIsSending(true);
    sendTestMutation.mutate({
      to: phone,
      templateType,
      locale,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="test-phone">{t('phoneLabel')}</Label>
          <Input
            id="test-phone"
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {t('phoneHelp')}
          </p>
        </div>

        {/* Template Type */}
        <div className="space-y-2">
          <Label htmlFor="sms-template-type">{t('templateLabel')}</Label>
          <Select
            value={templateType}
            onValueChange={(value: 'wedding_reminder' | 'rsvp_confirmation' | 'payment_reminder') =>
              setTemplateType(value)
            }
          >
            <SelectTrigger id="sms-template-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wedding_reminder">{t('templates.weddingReminder')}</SelectItem>
              <SelectItem value="rsvp_confirmation">{t('templates.rsvpConfirmation')}</SelectItem>
              <SelectItem value="payment_reminder">{t('templates.paymentReminder')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t('templateHelp')}
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="sms-locale">{t('languageLabel')}</Label>
          <Select
            value={locale}
            onValueChange={(value: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi') => setLocale(value)}
          >
            <SelectTrigger id="sms-locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('languages.en')}</SelectItem>
              <SelectItem value="es">{t('languages.es')}</SelectItem>
              <SelectItem value="fr">{t('languages.fr')}</SelectItem>
              <SelectItem value="de">{t('languages.de')}</SelectItem>
              <SelectItem value="ja">{t('languages.ja')}</SelectItem>
              <SelectItem value="zh">{t('languages.zh')}</SelectItem>
              <SelectItem value="hi">{t('languages.hi')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t('languageHelp')}
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>{t('noteTitle')}</strong> {t('noteDescription')}
          </p>
        </div>

        {/* Send Button */}
        <Button onClick={handleSendTest} disabled={isSending} className="w-full" size="lg">
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sending')}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t('sendButton')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
