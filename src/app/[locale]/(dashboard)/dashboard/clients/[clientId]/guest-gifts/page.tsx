'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { Package, Gift, Users, Clock } from 'lucide-react'

/**
 * Guest Gifts Page - Welcome gifts, party favors, etc.
 *
 * This page manages gifts given TO guests (different from /gifts which tracks
 * gifts received FROM guests).
 *
 * Examples: Welcome bags, party favors, bridesmaid/groomsmen gifts
 */
export default function GuestGiftsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const t = useTranslations('guestGifts')
  const tc = useTranslations('common')
  const tn = useTranslations('navigation')

  if (!clientId) {
    return (
      <div className="p-6">
        <p>{tc('noClientSelected')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <ClientModuleHeader
        title={tn('giftsGiven') || 'Gifts Given'}
        description={t('pageDescription') || 'Manage welcome gifts, party favors, and gifts for your guests'}
      />

      {/* Coming Soon Banner */}
      <Card className="border-gold-200 bg-gold-50/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="p-4 rounded-full bg-gold-100">
              <Package className="w-12 h-12 text-gold-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gold-900">
                {t('comingSoon') || 'Coming Soon'}
              </h3>
              <p className="text-gold-700 max-w-md">
                {t('comingSoonDesc') || 'Track and manage welcome bags, party favors, bridesmaid/groomsmen gifts, and other gifts for your wedding guests.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              <CardTitle className="text-base">{t('welcomeBags') || 'Welcome Bags'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('welcomeBagsDesc') || 'Curate welcome bag contents and track delivery to hotels'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cobalt-500" />
              <CardTitle className="text-base">{t('weddingParty') || 'Wedding Party Gifts'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('weddingPartyDesc') || 'Track bridesmaid, groomsmen, and bridal party gifts'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              <CardTitle className="text-base">{t('partyFavors') || 'Party Favors'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('partyFavorsDesc') || 'Manage party favor inventory and distribution'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
