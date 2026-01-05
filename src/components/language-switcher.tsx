'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/lib/navigation'
import { Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/use-toast'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('common')

  // Update user preferences mutation
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: t('languageUpdated'),
        description: t('languagePreferenceSaved'),
      })
    },
    onError: (error) => {
      console.error('Failed to update language preference:', error)
      // Don't show error toast - language still changes in UI
    },
  })

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale || isPending) return

    // Update user preference in database (fire and forget)
    updatePreferences.mutate({ preferred_language: newLocale })

    // Use next-intl's router which handles locale switching properly
    startTransition(() => {
      router.replace(pathname, { locale: newLocale })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-block">
            {localeFlags[locale]} {localeNames[locale]}
          </span>
          <span className="sm:hidden">{localeFlags[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLanguageChange(loc)}
            disabled={isPending}
            className="cursor-pointer"
          >
            <span className="mr-2 text-lg">{localeFlags[loc]}</span>
            <span className="flex-1">{localeNames[loc]}</span>
            {locale === loc && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
