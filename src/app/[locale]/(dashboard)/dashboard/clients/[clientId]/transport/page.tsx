'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { Car, Plane, Bus, MapPin } from 'lucide-react'

/**
 * Guest Transport Page - Travel coordination for wedding guests
 *
 * Manages transportation logistics:
 * - Airport pickups/dropoffs
 * - Shuttle services
 * - Guest travel itineraries
 * - Transportation schedules
 */
export default function TransportPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const t = useTranslations('transport')
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
        title={tn('travel') || 'Travel'}
        description={t('description') || 'Coordinate guest transportation and travel logistics'}
      />

      {/* Coming Soon Banner */}
      <Card className="border-gold-200 bg-gold-50/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="p-4 rounded-full bg-gold-100">
              <Car className="w-12 h-12 text-gold-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gold-900">
                {t('comingSoon') || 'Coming Soon'}
              </h3>
              <p className="text-gold-700 max-w-md">
                {t('comingSoonDesc') || 'Coordinate airport pickups, shuttle services, and guest transportation to ensure everyone arrives safely and on time.'}
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
              <Plane className="w-5 h-5 text-cobalt-500" />
              <CardTitle className="text-base">{t('airportTransfers') || 'Airport Transfers'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('airportTransfersDesc') || 'Schedule pickups and dropoffs for arriving guests'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-teal-500" />
              <CardTitle className="text-base">{t('shuttleService') || 'Shuttle Service'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('shuttleServiceDesc') || 'Organize shuttles between venues and hotels'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <CardTitle className="text-base">{t('travelItinerary') || 'Travel Itinerary'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('travelItineraryDesc') || 'Track guest arrival times and travel plans'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
