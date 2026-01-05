'use client'

import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

/**
 * Example component demonstrating i18n usage in WeddingFlo
 *
 * This component shows:
 * 1. How to use multiple translation namespaces
 * 2. Form elements with translated labels
 * 3. Buttons with translated text
 * 4. Dynamic error messages
 * 5. Toast notifications with translations
 */
export function TranslatedComponentExample() {
  // Load different translation namespaces
  const tCommon = useTranslations('common')
  const tClients = useTranslations('clients')
  const tErrors = useTranslations('errors')

  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Success toast with translated message
      toast({
        title: tCommon('success'),
        description: tClients('addClient') + ' - ' + tCommon('success'),
      })
    } catch (error) {
      // Error toast with translated message
      toast({
        title: tCommon('error'),
        description: tErrors('generic'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        {/* Translated card title */}
        <CardTitle>{tClients('addClient')}</CardTitle>
        {/* Translated card description */}
        <CardDescription>{tClients('clientInfo')}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner 1 Name */}
          <div className="space-y-2">
            <Label htmlFor="partner1">
              {tClients('partner1Name')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="partner1"
              type="text"
              placeholder={tClients('partner1Name')}
              required
            />
          </div>

          {/* Partner 2 Name */}
          <div className="space-y-2">
            <Label htmlFor="partner2">
              {tClients('partner2Name')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="partner2"
              type="text"
              placeholder={tClients('partner2Name')}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              {tClients('email')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={tClients('email')}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              {tClients('phone')}
              <span className="text-muted-foreground ml-1">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={tClients('phone')}
            />
          </div>

          {/* Wedding Date */}
          <div className="space-y-2">
            <Label htmlFor="weddingDate">
              {tClients('weddingDate')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="weddingDate"
              type="date"
              required
            />
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">
              {tClients('venue')}
              <span className="text-muted-foreground ml-1">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="venue"
              type="text"
              placeholder={tClients('venueName')}
            />
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">
              {tClients('budget')}
              <span className="text-muted-foreground ml-1">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="budget"
              type="number"
              placeholder="0.00"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {tClients('notes')}
              <span className="text-muted-foreground ml-1">
                ({tCommon('optional')})
              </span>
            </Label>
            <textarea
              id="notes"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={tClients('notes')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Usage in a page:
 *
 * import { TranslatedComponentExample } from '@/components/examples/translated-component-example'
 *
 * export default function ExamplePage() {
 *   return (
 *     <div className="container py-8">
 *       <TranslatedComponentExample />
 *     </div>
 *   )
 * }
 */
