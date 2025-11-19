'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Check, Languages } from 'lucide-react'
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
  const [isChanging, setIsChanging] = useState(false)

  // Update user preferences mutation
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: 'Language updated',
        description: 'Your language preference has been saved.',
      })
    },
    onError: (error) => {
      console.error('Failed to update language preference:', error)
      // Don't show error toast - language still changes in UI
    },
  })

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || isChanging) return

    setIsChanging(true)

    try {
      // Update user preference in database (fire and forget)
      updatePreferences.mutate({ preferred_language: newLocale })

      // Navigate to new locale
      // Remove current locale from pathname and add new locale
      const pathWithoutLocale = pathname.replace(`/${locale}`, '')
      const newPath = `/${newLocale}${pathWithoutLocale || ''}`

      router.push(newPath)
      router.refresh()
    } catch (error) {
      console.error('Error changing language:', error)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
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
            disabled={isChanging}
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
