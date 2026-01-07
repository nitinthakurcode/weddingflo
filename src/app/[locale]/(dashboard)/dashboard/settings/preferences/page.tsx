'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SUPPORTED_CURRENCIES, detectCurrencyFromLocation, formatCurrency, type CurrencyCode } from '@/lib/currency';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { useToast } from '@/hooks/use-toast';
import { Info, Globe, DollarSign, Clock, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';

const TIMEZONES = [
  // UTC/GMT
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },
  { value: 'Etc/GMT', label: 'GMT (Greenwich Mean Time)', region: 'UTC' },
  // Americas - North
  { value: 'America/New_York', label: 'New York (ET)', region: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago (CT)', region: 'Americas' },
  { value: 'America/Denver', label: 'Denver (MT)', region: 'Americas' },
  { value: 'America/Phoenix', label: 'Phoenix (MST)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto (ET)', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)', region: 'Americas' },
  { value: 'America/Edmonton', label: 'Edmonton (MT)', region: 'Americas' },
  { value: 'America/Winnipeg', label: 'Winnipeg (CT)', region: 'Americas' },
  { value: 'America/Halifax', label: 'Halifax (AT)', region: 'Americas' },
  { value: 'America/St_Johns', label: "St. John's (NT)", region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)', region: 'Americas' },
  { value: 'America/Tijuana', label: 'Tijuana (PT)', region: 'Americas' },
  { value: 'America/Cancun', label: 'Cancun (EST)', region: 'Americas' },
  // Americas - Caribbean
  { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)', region: 'Americas' },
  { value: 'America/Jamaica', label: 'Jamaica (EST)', region: 'Americas' },
  { value: 'America/Havana', label: 'Havana (CST)', region: 'Americas' },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo (AST)', region: 'Americas' },
  { value: 'America/Barbados', label: 'Barbados (AST)', region: 'Americas' },
  { value: 'America/Nassau', label: 'Nassau (EST)', region: 'Americas' },
  // Americas - Central
  { value: 'America/Guatemala', label: 'Guatemala (CST)', region: 'Americas' },
  { value: 'America/Costa_Rica', label: 'Costa Rica (CST)', region: 'Americas' },
  { value: 'America/Panama', label: 'Panama (EST)', region: 'Americas' },
  // Americas - South
  { value: 'America/Bogota', label: 'Bogotá (COT)', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima (PET)', region: 'Americas' },
  { value: 'America/Quito', label: 'Quito (ECT)', region: 'Americas' },
  { value: 'America/Guayaquil', label: 'Guayaquil (ECT)', region: 'Americas' },
  { value: 'America/Caracas', label: 'Caracas (VET)', region: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago (CLT)', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', region: 'Americas' },
  { value: 'America/Rio_de_Janeiro', label: 'Rio de Janeiro (BRT)', region: 'Americas' },
  { value: 'America/Montevideo', label: 'Montevideo (UYT)', region: 'Americas' },
  { value: 'America/Asuncion', label: 'Asunción (PYT)', region: 'Americas' },
  { value: 'America/La_Paz', label: 'La Paz (BOT)', region: 'Americas' },
  // Europe - Western
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET/WEST)', region: 'Europe' },
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik (GMT)', region: 'Europe' },
  // Europe - Central
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Milan', label: 'Milan (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Barcelona', label: 'Barcelona (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Munich', label: 'Munich (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Frankfurt', label: 'Frankfurt (CET/CEST)', region: 'Europe' },
  // Europe - Nordic
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)', region: 'Europe' },
  // Europe - Eastern
  { value: 'Europe/Warsaw', label: 'Warsaw (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Prague', label: 'Prague (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Budapest', label: 'Budapest (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Bucharest', label: 'Bucharest (EET/EEST)', region: 'Europe' },
  { value: 'Europe/Sofia', label: 'Sofia (EET/EEST)', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (EET/EEST)', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)', region: 'Europe' },
  { value: 'Europe/Kiev', label: 'Kyiv (EET/EEST)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', region: 'Europe' },
  { value: 'Europe/Minsk', label: 'Minsk (MSK)', region: 'Europe' },
  // Middle East
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Middle East' },
  { value: 'Asia/Abu_Dhabi', label: 'Abu Dhabi (GST)', region: 'Middle East' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)', region: 'Middle East' },
  { value: 'Asia/Jeddah', label: 'Jeddah (AST)', region: 'Middle East' },
  { value: 'Asia/Kuwait', label: 'Kuwait (AST)', region: 'Middle East' },
  { value: 'Asia/Doha', label: 'Doha (AST)', region: 'Middle East' },
  { value: 'Asia/Bahrain', label: 'Bahrain (AST)', region: 'Middle East' },
  { value: 'Asia/Muscat', label: 'Muscat (GST)', region: 'Middle East' },
  { value: 'Asia/Amman', label: 'Amman (EET)', region: 'Middle East' },
  { value: 'Asia/Beirut', label: 'Beirut (EET)', region: 'Middle East' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)', region: 'Middle East' },
  { value: 'Asia/Tehran', label: 'Tehran (IRST)', region: 'Middle East' },
  { value: 'Asia/Baghdad', label: 'Baghdad (AST)', region: 'Middle East' },
  // Asia - South
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)', region: 'Asia' },
  { value: 'Asia/Chennai', label: 'Chennai (IST)', region: 'Asia' },
  { value: 'Asia/Bangalore', label: 'Bangalore (IST)', region: 'Asia' },
  { value: 'Asia/Hyderabad', label: 'Hyderabad (IST)', region: 'Asia' },
  { value: 'Asia/Colombo', label: 'Colombo (IST)', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST)', region: 'Asia' },
  { value: 'Asia/Karachi', label: 'Karachi (PKT)', region: 'Asia' },
  { value: 'Asia/Lahore', label: 'Lahore (PKT)', region: 'Asia' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (NPT)', region: 'Asia' },
  // Asia - Southeast
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', region: 'Asia' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (ICT)', region: 'Asia' },
  { value: 'Asia/Hanoi', label: 'Hanoi (ICT)', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB)', region: 'Asia' },
  { value: 'Asia/Bali', label: 'Bali (WITA)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila (PHT)', region: 'Asia' },
  { value: 'Asia/Phnom_Penh', label: 'Phnom Penh (ICT)', region: 'Asia' },
  { value: 'Asia/Yangon', label: 'Yangon (MMT)', region: 'Asia' },
  // Asia - East
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia' },
  { value: 'Asia/Macau', label: 'Macau (CST)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', region: 'Asia' },
  { value: 'Asia/Beijing', label: 'Beijing (CST)', region: 'Asia' },
  { value: 'Asia/Shenzhen', label: 'Shenzhen (CST)', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei (CST)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia' },
  { value: 'Asia/Osaka', label: 'Osaka (JST)', region: 'Asia' },
  // Asia - Central
  { value: 'Asia/Almaty', label: 'Almaty (ALMT)', region: 'Asia' },
  { value: 'Asia/Tashkent', label: 'Tashkent (UZT)', region: 'Asia' },
  { value: 'Asia/Yekaterinburg', label: 'Yekaterinburg (YEKT)', region: 'Asia' },
  { value: 'Asia/Novosibirsk', label: 'Novosibirsk (NOVT)', region: 'Asia' },
  { value: 'Asia/Vladivostok', label: 'Vladivostok (VLAT)', region: 'Asia' },
  // Oceania - Australia
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Oceania' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', region: 'Oceania' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST)', region: 'Oceania' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', region: 'Oceania' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', region: 'Oceania' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)', region: 'Oceania' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST)', region: 'Oceania' },
  { value: 'Australia/Canberra', label: 'Canberra (AEST)', region: 'Oceania' },
  // Oceania - Pacific
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', region: 'Oceania' },
  { value: 'Pacific/Wellington', label: 'Wellington (NZST)', region: 'Oceania' },
  { value: 'Pacific/Fiji', label: 'Fiji (FJT)', region: 'Oceania' },
  { value: 'Pacific/Guam', label: 'Guam (ChST)', region: 'Oceania' },
  { value: 'Pacific/Tahiti', label: 'Tahiti (TAHT)', region: 'Oceania' },
  { value: 'Pacific/Samoa', label: 'Samoa (SST)', region: 'Oceania' },
  // Africa - North
  { value: 'Africa/Cairo', label: 'Cairo (EET)', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca (WET)', region: 'Africa' },
  { value: 'Africa/Tunis', label: 'Tunis (CET)', region: 'Africa' },
  { value: 'Africa/Algiers', label: 'Algiers (CET)', region: 'Africa' },
  { value: 'Africa/Tripoli', label: 'Tripoli (EET)', region: 'Africa' },
  // Africa - West
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', region: 'Africa' },
  { value: 'Africa/Accra', label: 'Accra (GMT)', region: 'Africa' },
  { value: 'Africa/Dakar', label: 'Dakar (GMT)', region: 'Africa' },
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT)', region: 'Africa' },
  // Africa - East
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', region: 'Africa' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)', region: 'Africa' },
  { value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam (EAT)', region: 'Africa' },
  { value: 'Africa/Kampala', label: 'Kampala (EAT)', region: 'Africa' },
  { value: 'Africa/Kigali', label: 'Kigali (CAT)', region: 'Africa' },
  // Africa - South
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', region: 'Africa' },
  { value: 'Africa/Cape_Town', label: 'Cape Town (SAST)', region: 'Africa' },
  { value: 'Africa/Durban', label: 'Durban (SAST)', region: 'Africa' },
  { value: 'Africa/Harare', label: 'Harare (CAT)', region: 'Africa' },
  { value: 'Africa/Lusaka', label: 'Lusaka (CAT)', region: 'Africa' },
  // Atlantic
  { value: 'Atlantic/Azores', label: 'Azores (AZOT)', region: 'Atlantic' },
  { value: 'Atlantic/Canary', label: 'Canary Islands (WET)', region: 'Atlantic' },
  { value: 'Atlantic/Cape_Verde', label: 'Cape Verde (CVT)', region: 'Atlantic' },
  { value: 'Atlantic/Bermuda', label: 'Bermuda (AST)', region: 'Atlantic' },
] as const;

export default function PreferencesPage() {
  useSession(); // Ensure user is authenticated
  const { toast } = useToast();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [autoDetect, setAutoDetect] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState<Locale>(currentLocale);
  const [detectedCurrency, setDetectedCurrency] = useState<CurrencyCode>('USD');

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.users.getPreferences.useQuery();

  // Update preferences mutation
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: tCommon('success'),
        description: t('preferencesSaved'),
      });
      refetch();
      // Note: Language changes are handled separately in handleSave via router.push()
      // No page reload needed - React will re-render with updated data
    },
    onError: (error) => {
      toast({
        title: tCommon('error'),
        description: `${t('preferencesError')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Load preferences when data arrives
  useEffect(() => {
    if (preferences) {
      setCurrency((preferences.preferred_currency as CurrencyCode) || 'USD');
      setTimezone(preferences.timezone || 'America/New_York');
      setAutoDetect(preferences.auto_detect_locale ?? true);
      if (preferences.preferred_language) {
        setLanguage(preferences.preferred_language as Locale);
      }
    }
  }, [preferences]);

  // Auto-detect on mount
  useEffect(() => {
    const detected = detectCurrencyFromLocation();
    setDetectedCurrency(detected);

    if (autoDetect && !preferences) {
      setCurrency(detected);
    }
  }, [autoDetect, preferences]);

  const handleSave = () => {
    updatePreferences.mutate({
      preferred_currency: currency,
      preferred_language: language,
      timezone,
      auto_detect_locale: autoDetect,
    });

    // If language changed, navigate to new locale
    if (language !== currentLocale) {
      const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');
      const newPath = `/${language}${pathWithoutLocale || ''}`;
      setTimeout(() => {
        router.push(newPath);
      }, 500);
    }
  };

  // Preview examples
  const exampleAmount = 1234.56;
  const smallAmount = 29;
  const largeAmount = 15999;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">{t('loadingPreferences')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-mocha-100 dark:to-mocha-300 bg-clip-text text-transparent">
          {t('preferences')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('preferencesSubtitle')}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Auto-detection Card */}
        <Card
          variant="glass"
          className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                {t('autoDetection')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('autoDetectionDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-detect" className="text-base">
                  {t('enableAutoDetection')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('autoDetectionNote')}
                </p>
              </div>
              <Switch
                id="auto-detect"
                checked={autoDetect}
                onCheckedChange={setAutoDetect}
              />
            </div>

            {autoDetect && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t('detected')}: <strong>{detectedCurrency}</strong> ({SUPPORTED_CURRENCIES.find(c => c.code === detectedCurrency)?.name})
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card
          variant="glass"
          className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
                <Languages className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                {t('language')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('languageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t('preferredLanguage')}</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as Locale)}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{localeFlags[loc]}</span>
                        <span>{localeNames[loc]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {language !== currentLocale && (
                <p className="text-sm text-muted-foreground">
                  {t('languageChangeNote')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Currency Card */}
        <Card
          variant="glass"
          className="border border-sage-200/50 dark:border-sage-800/30 shadow-lg shadow-sage-500/10 bg-gradient-to-br from-white via-sage-50/20 to-white dark:from-mocha-900 dark:via-sage-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-lg shadow-sage-500/30">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="bg-gradient-to-r from-sage-600 to-sage-500 bg-clip-text text-transparent">
                {t('currency')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('currencyDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('preferredCurrency')}</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as CurrencyCode)}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">{curr.symbol}</span>
                        <span>{curr.code}</span>
                        <span className="text-muted-foreground">- {curr.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {autoDetect && (
                <p className="text-sm text-muted-foreground">
                  {t('currencyAutoDetectedNote')}
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <p className="text-sm font-medium">{t('preview')}:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subscriptionStarter')}:</span>
                  <span className="font-medium">{formatCurrency(smallAmount, currency)}/{tCommon('month')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('budgetItem')}:</span>
                  <span className="font-medium">{formatCurrency(exampleAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('vendorCost')}:</span>
                  <span className="font-medium">{formatCurrency(largeAmount, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timezone Card */}
        <Card
          variant="glass"
          className="border border-gold-200/50 dark:border-gold-800/30 shadow-lg shadow-gold-500/10 bg-gradient-to-br from-white via-gold-50/20 to-white dark:from-mocha-900 dark:via-gold-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 shadow-lg shadow-gold-500/30">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="bg-gradient-to-r from-gold-600 to-gold-500 bg-clip-text text-transparent">
                {t('timezone')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('timezoneDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('currentTime')}: {new Date().toLocaleTimeString('en-US', { timeZone: timezone })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // Reset to saved values
              if (preferences) {
                setCurrency((preferences.preferred_currency as CurrencyCode) || 'USD');
                setTimezone(preferences.timezone || 'America/New_York');
                setAutoDetect(preferences.auto_detect_locale ?? true);
                setLanguage((preferences.preferred_language as Locale) || currentLocale);
              }
            }}
          >
            {tCommon('reset')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending}
          >
            {updatePreferences.isPending ? tCommon('saving') : t('savePreferences')}
          </Button>
        </div>
      </div>
    </div>
  );
}
