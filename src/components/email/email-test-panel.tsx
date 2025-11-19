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
import { Loader2, Mail, Send } from 'lucide-react';

export function EmailTestPanel() {
  const t = useTranslations('emailTest');
  const [email, setEmail] = useState('');
  const [templateType, setTemplateType] = useState<
    'client_invite' | 'wedding_reminder' | 'payment_reminder' | 'rsvp_confirmation' | 'payment_receipt' | 'vendor_communication'
  >('client_invite');
  const [locale, setLocale] = useState<'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi'>('en');
  const [isSending, setIsSending] = useState(false);

  const sendTestMutation = trpc.email.sendTestEmail.useMutation({
    onSuccess: (data) => {
      toast.success(t('successMessage', { email }));
      setIsSending(false);
    },
    onError: (error) => {
      toast.error(t('errorMessage'));
      setIsSending(false);
    },
  });

  const handleSendTest = async () => {
    if (!email) {
      toast.error(t('validation.emailRequired'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t('validation.emailInvalid'));
      return;
    }

    setIsSending(true);
    sendTestMutation.mutate({
      to: email,
      templateType,
      locale,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Address */}
        <div className="space-y-2">
          <Label htmlFor="test-email">{t('recipientLabel')}</Label>
          <Input
            id="test-email"
            type="email"
            placeholder={t('recipientPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Template Type */}
        <div className="space-y-2">
          <Label htmlFor="template-type">{t('templateLabel')}</Label>
          <Select
            value={templateType}
            onValueChange={(
              value:
                | 'client_invite'
                | 'wedding_reminder'
                | 'payment_reminder'
                | 'rsvp_confirmation'
                | 'payment_receipt'
                | 'vendor_communication'
            ) => setTemplateType(value)}
          >
            <SelectTrigger id="template-type">
              <SelectValue placeholder={t('templatePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client_invite">{t('templates.weddingReminder')}</SelectItem>
              <SelectItem value="wedding_reminder">{t('templates.weddingReminder')}</SelectItem>
              <SelectItem value="payment_reminder">{t('templates.budgetAlert')}</SelectItem>
              <SelectItem value="rsvp_confirmation">{t('templates.guestUpdate')}</SelectItem>
              <SelectItem value="payment_receipt">{t('templates.budgetAlert')}</SelectItem>
              <SelectItem value="vendor_communication">{t('templates.vendorMessage')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="locale">{t('languageLabel')}</Label>
          <Select
            value={locale}
            onValueChange={(value: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi') => setLocale(value)}
          >
            <SelectTrigger id="locale">
              <SelectValue placeholder={t('languagePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="es">🇪🇸 Español</SelectItem>
              <SelectItem value="fr">🇫🇷 Français</SelectItem>
              <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
              <SelectItem value="ja">🇯🇵 日本語</SelectItem>
              <SelectItem value="zh">🇨🇳 中文</SelectItem>
              <SelectItem value="hi">🇮🇳 हिन्दी</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Send Button */}
        <Button onClick={handleSendTest} disabled={isSending} className="w-full" size="lg">
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sendingButton')}
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
