'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Link, useRouter } from '@/lib/navigation'
import { trpc } from '@/lib/trpc/client'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Hotel,
  Gift,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  MessageSquare,
  LayoutGrid,
  Package,
  Car,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { exportMasterPlanningExcel, type MasterExportData } from '@/lib/export/excel-exporter'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const tn = useTranslations('navigation')
  const tm = useTranslations('modules')
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Query client details
  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId }
  )

  // Queries for Master Export - only fetch when needed
  const guestsQuery = trpc.guests.getAll.useQuery({ clientId }, { enabled: false })
  const hotelsQuery = trpc.hotels.getAllWithGuests.useQuery({ clientId }, { enabled: false })
  const guestGiftsQuery = trpc.guestGifts.list.useQuery({ clientId }, { enabled: false })
  const eventsQuery = trpc.events.getAll.useQuery({ clientId }, { enabled: false })
  const timelineQuery = trpc.timeline.getAll.useQuery({ clientId }, { enabled: false })
  const budgetQuery = trpc.budget.getAll.useQuery({ clientId }, { enabled: false })
  const vendorsQuery = trpc.vendors.getAll.useQuery({ clientId }, { enabled: false })

  // Google Sheets Sync mutation
  const syncMutation = trpc.googleSheets.syncNow.useMutation({
    onSuccess: (data) => {
      toast({
        title: tm('syncSuccess') || 'Sync Successful',
        description: data.spreadsheetUrl
          ? tm('syncCompleteWithLink') || 'Data synced to Google Sheets successfully.'
          : tm('syncComplete') || 'Data synced successfully.',
      })
      setIsSyncing(false)
    },
    onError: (error) => {
      toast({
        title: tc('error') || 'Error',
        description: error.message || tm('syncFailed') || 'Failed to sync to Google Sheets.',
        variant: 'destructive',
      })
      setIsSyncing(false)
    },
  })

  // Handle Sync to Google Sheets
  const handleSync = () => {
    if (!clientId) return
    setIsSyncing(true)
    syncMutation.mutate({ clientId })
  }

  // Handle Master Export
  const handleMasterExport = async () => {
    if (!client) return

    setIsExporting(true)
    try {
      // Refetch all data
      const [guests, hotels, guestGifts, events, timeline, budget, vendors] = await Promise.all([
        guestsQuery.refetch(),
        hotelsQuery.refetch(),
        guestGiftsQuery.refetch(),
        eventsQuery.refetch(),
        timelineQuery.refetch(),
        budgetQuery.refetch(),
        vendorsQuery.refetch(),
      ])

      const clientName = client.weddingName ||
        [
          client.partner1FirstName,
          client.partner1LastName,
          client.partner2FirstName && '&',
          client.partner2FirstName,
          client.partner2LastName
        ].filter(Boolean).join(' ')

      const masterData: MasterExportData = {
        clientName,
        weddingDate: client.weddingDate || undefined,
        guests: (guests.data || []).map((g: any) => ({
          id: g.id,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone,
          groupName: g.groupName,
          rsvpStatus: g.rsvpStatus,
          partySize: g.partySize,
          dietaryRestrictions: g.dietaryRestrictions,
          mealPreference: g.mealPreference,
          hotelRequired: g.hotelRequired,
          transportRequired: g.transportRequired,
          notes: g.notes,
          updatedAt: g.updatedAt,
        })),
        hotels: (hotels.data || []).map((h: any) => ({
          id: h.id,
          guestId: h.guestId,
          guestName: h.guestName,
          accommodationNeeded: h.accommodationNeeded,
          hotelName: h.hotelName,
          roomNumber: h.roomNumber,
          roomType: h.roomType,
          checkInDate: h.checkInDate,
          checkOutDate: h.checkOutDate,
          bookingConfirmed: h.bookingConfirmed,
          checkedIn: h.checkedIn,
          notes: h.notes,
          updatedAt: h.updatedAt,
        })),
        guestGifts: (guestGifts.data || []).map((g: any) => ({
          id: g.id,
          guestId: g.guestId,
          giftName: g.giftName || g.giftItem?.name || '',
          giftType: g.giftType,
          quantity: g.quantity,
          deliveryDate: g.deliveryDate,
          deliveryTime: g.deliveryTime,
          deliveryLocation: g.deliveryLocation,
          deliveryStatus: g.deliveryStatus,
          deliveredBy: g.deliveredBy,
          notes: g.notes,
          guest: g.guest,
          updatedAt: g.updatedAt,
        })),
        events: (events.data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          eventDate: e.eventDate,
          startTime: e.startTime,
          endTime: e.endTime,
          venue: e.venueName || e.venue || '',
          description: e.description,
          updatedAt: e.updatedAt,
        })),
        timeline: (timeline.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          startTime: t.startTime,
          endTime: t.endTime,
          durationMinutes: t.durationMinutes,
          location: t.location,
          responsiblePerson: t.responsiblePerson,
          description: t.description,
          completed: t.completed,
          updatedAt: t.updatedAt,
        })),
        budget: (budget.data || []).map((b: any) => ({
          id: b.id,
          item: b.item || b.expenseDetails,
          category: b.category,
          estimatedCost: b.estimatedCost || b.budgetAmount,
          actualCost: b.actualCost || b.cost,
          paymentStatus: b.paymentStatus,
          notes: b.notes,
          events: b.events,
          updatedAt: b.updatedAt,
        })),
        vendors: (vendors.data || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          category: v.category,
          contactName: v.contactName,
          phone: v.phone,
          email: v.email,
          contractAmount: v.contractAmount,
          paymentStatus: v.paymentStatus,
          serviceDate: v.serviceDate,
          notes: v.notes,
          updatedAt: v.updatedAt,
        })),
      }

      await exportMasterPlanningExcel(masterData)

      toast({
        title: tm('exportSuccess') || 'Export Successful',
        description: tm('masterExportComplete') || 'Master planning sheet has been exported successfully.',
      })
    } catch (error: any) {
      // Enhanced error logging
      console.error('Master export failed:', error)
      console.error('Error name:', error?.name)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})))
      toast({
        title: tc('error') || 'Error',
        description: error?.message || tm('exportFailed') || 'Failed to export master planning sheet.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p>{tc('noClientSelected')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>{tc('loadingDetails')}</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6">
        <p>{tc('noClientFound')}</p>
      </div>
    )
  }

  // Modules ordered per user specification:
  // Guests → Travel → Hotels → Gifts Given → Events → Timeline → Seating → Vendors → Budgets → Documents → Gifts Received
  // Each module has an rgbColor for the themed module-card system (60-30-10 rule)
  const modules = [
    {
      titleKey: 'guests',
      descKey: 'guestsDesc',
      icon: Users,
      href: `/dashboard/clients/${clientId}/guests`,
      color: 'text-cobalt-600',
      bgColor: 'bg-cobalt-50',
      rgbColor: '37, 99, 235', // Cobalt
    },
    {
      titleKey: 'travel',
      descKey: 'travelDesc',
      icon: Car,
      href: `/dashboard/clients/${clientId}/transport`,
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
      rgbColor: '212, 168, 83', // Gold/Accent
    },
    {
      titleKey: 'hotels',
      descKey: 'hotelsDesc',
      icon: Hotel,
      href: `/dashboard/clients/${clientId}/hotels`,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      rgbColor: '20, 184, 166', // Teal/Primary
    },
    {
      titleKey: 'giftsGiven',
      descKey: 'giftsGivenDesc',
      icon: Package,
      href: `/dashboard/clients/${clientId}/guest-gifts`,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      rgbColor: '225, 29, 72', // Rose
    },
    {
      titleKey: 'events',
      descKey: 'eventsDesc',
      icon: Calendar,
      href: `/dashboard/clients/${clientId}/events`,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      rgbColor: '20, 184, 166', // Teal/Primary
    },
    {
      titleKey: 'timeline',
      descKey: 'timelineDesc',
      icon: Clock,
      href: `/dashboard/clients/${clientId}/timeline`,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      rgbColor: '20, 184, 166', // Teal/Primary
    },
    {
      titleKey: 'seating',
      descKey: 'seatingDesc',
      icon: LayoutGrid,
      href: `/dashboard/clients/${clientId}/seating`,
      color: 'text-cobalt-600',
      bgColor: 'bg-cobalt-50',
      rgbColor: '37, 99, 235', // Cobalt
    },
    {
      titleKey: 'vendors',
      descKey: 'vendorsDesc',
      icon: Briefcase,
      href: `/dashboard/clients/${clientId}/vendors`,
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
      rgbColor: '212, 168, 83', // Gold/Accent
    },
    {
      titleKey: 'budgets',
      descKey: 'budgetsDesc',
      icon: DollarSign,
      href: `/dashboard/clients/${clientId}/budget`,
      color: 'text-sage-600',
      bgColor: 'bg-sage-50',
      rgbColor: '90, 154, 73', // Sage
    },
    {
      titleKey: 'documents',
      descKey: 'documentsDesc',
      icon: FileText,
      href: `/dashboard/clients/${clientId}/documents`,
      color: 'text-mocha-600',
      bgColor: 'bg-mocha-50',
      rgbColor: '139, 116, 97', // Mocha
    },
    {
      titleKey: 'giftsReceived',
      descKey: 'giftsReceivedDesc',
      icon: Gift,
      href: `/dashboard/clients/${clientId}/gifts`,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      rgbColor: '225, 29, 72', // Rose
    },
  ]

  // Get locale-specific date format
  const getDateLocale = () => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      de: 'de-DE',
      es: 'es-ES',
      fr: 'fr-FR',
      ja: 'ja-JP',
      zh: 'zh-CN',
      hi: 'hi-IN',
    }
    return localeMap[locale] || 'en-US'
  }

  // Check if any family details exist
  const hasFamilyDetails = client.partner1FatherName || client.partner1MotherName ||
                           client.partner2FatherName || client.partner2MotherName

  return (
    <div className="container-fluid py-fluid space-y-fluid bg-page">
      {/* Header - Modern Editorial Style */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/clients')}
            className="self-start press-feedback hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToClients')}
          </Button>
          <div className="space-y-2">
            {/* Wedding Name - Editorial Heading */}
            <h1 className="heading-editorial text-3xl sm:text-4xl md:text-5xl font-bold">
              {client.weddingName || [
                client.partner1FirstName,
                client.partner1LastName,
                client.partner2FirstName && '&',
                client.partner2FirstName,
                client.partner2LastName
              ].filter(Boolean).join(' ')}
            </h1>
            {/* Show partner names as subtitle if wedding name is used */}
            {client.weddingName && (
              <p className="text-base sm:text-lg text-muted-foreground/80 font-medium">
                {client.partner1FirstName}{client.partner1LastName && ` ${client.partner1LastName}`}
                {client.partner2FirstName && ` & ${client.partner2FirstName}`}{client.partner2LastName && ` ${client.partner2LastName}`}
              </p>
            )}
            <p className="text-sm sm:text-base text-muted-foreground">{t('weddingOverview')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMasterExport}
            disabled={isExporting}
            className="btn-ghost-gradient press-feedback"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">{isExporting ? tc('exporting') || 'Exporting...' : tm('exportMasterSheet') || 'Export Master Sheet'}</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-ghost-gradient press-feedback"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync to Sheets'}</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          <Button
            onClick={() => router.push(`/portal/chat?clientId=${clientId}`)}
            className="btn-celebration-primary press-feedback"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{tm('chatWithClient')}</span>
            <span className="sm:hidden">Chat</span>
          </Button>
        </div>
      </div>

      {/* Wedding Details Card - Hero Card with Glass Tint (60-30-10 Rule) */}
      <div className="hero-card glass-card-tinted p-fluid shadow-themed-lg">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 section-header-themed">{t('weddingDetails')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {client.weddingDate && (
            <div className="space-y-2 animate-fade-in-up">
              <p className="label-themed">
                {t('weddingDate')}
              </p>
              <p className="font-bold text-sm sm:text-base">
                {new Date(client.weddingDate).toLocaleDateString(getDateLocale(), {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
          {client.venue && (
            <div className="space-y-2 animate-fade-in-up stagger-1">
              <p className="label-themed">
                {t('venue')}
              </p>
              <p className="font-bold text-sm sm:text-base">{client.venue}</p>
            </div>
          )}
          {client.partner1Email && (
            <div className="space-y-2 animate-fade-in-up stagger-2">
              <p className="label-themed">
                {tc('email')}
              </p>
              <p className="font-semibold text-sm sm:text-base truncate">{client.partner1Email}</p>
            </div>
          )}
          {client.partner1Phone && (
            <div className="space-y-2 animate-fade-in-up stagger-3">
              <p className="label-themed">
                {tc('phone')}
              </p>
              <p className="font-semibold text-sm sm:text-base">{client.partner1Phone}</p>
            </div>
          )}
          {client.notes && (
            <div className="sm:col-span-2 lg:col-span-4 space-y-2 animate-fade-in-up stagger-4">
              <p className="label-themed">
                {tc('notes')}
              </p>
              <p className="font-medium text-sm sm:text-base">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Family Details Card - Info Card with warm accent tint */}
      {hasFamilyDetails && (
        <div className="info-card p-fluid shadow-themed-md">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 section-header-themed">{t('familyDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bride's Parents */}
            {(client.partner1FatherName || client.partner1MotherName) && (
              <div className="space-y-2 bg-section-accent p-4 rounded-lg">
                <h4 className="font-semibold text-primary-safe">{t('brideParents')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {client.partner1FatherName && (
                    <div>
                      <p className="label-themed">{t('fatherName')}</p>
                      <p className="font-semibold">{client.partner1FatherName}</p>
                    </div>
                  )}
                  {client.partner1MotherName && (
                    <div>
                      <p className="label-themed">{t('motherName')}</p>
                      <p className="font-semibold">{client.partner1MotherName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Groom's Parents */}
            {(client.partner2FatherName || client.partner2MotherName) && (
              <div className="space-y-2 bg-section-primary p-4 rounded-lg">
                <h4 className="font-semibold text-primary-safe">{t('groomParents')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {client.partner2FatherName && (
                    <div>
                      <p className="label-themed">{t('fatherName')}</p>
                      <p className="font-semibold">{client.partner2FatherName}</p>
                    </div>
                  )}
                  {client.partner2MotherName && (
                    <div>
                      <p className="label-themed">{t('motherName')}</p>
                      <p className="font-semibold">{client.partner2MotherName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modules Grid - Bento Style with 60-30-10 Color Rule */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gradient-sunset section-header-themed">{tm('planningModules')}</h2>
          <div className="badge-celebration badge-sm">
            {modules.length} {tm('modules') || 'modules'}
          </div>
        </div>
        <div className="bento-grid-enhanced">
          {modules.map((module, index) => (
            <div
              key={module.titleKey}
              className={`
                group module-card cursor-pointer press-feedback
                ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}
                ${index === 3 ? 'md:col-span-2' : ''}
                ${index === 7 ? 'md:row-span-2' : ''}
              `}
              style={{ '--module-color-rgb': module.rgbColor } as React.CSSProperties}
              onClick={() => router.push(module.href)}
            >
              <div className="p-4 sm:p-6 h-full flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    p-3 rounded-xl ${module.bgColor}
                    transition-all duration-300
                    group-hover:scale-110 group-hover:rotate-3
                    group-hover:shadow-lg
                    shadow-md
                  `}>
                    <module.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${module.color}`} />
                  </div>
                  {index === 0 && (
                    <span className="badge-celebration featured text-[10px] px-2 py-1 animate-pulse-subtle">
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className={`
                    font-bold text-sm sm:text-base lg:text-lg tracking-tight
                    transition-colors duration-300
                    group-hover:text-primary
                  `}>
                    {tn(module.titleKey)}
                  </h3>
                  <p className={`
                    text-xs sm:text-sm text-muted-foreground leading-relaxed
                    ${index === 0 ? 'line-clamp-3' : 'line-clamp-2'}
                  `}>
                    {tm(module.descKey)}
                  </p>
                </div>

                {/* Arrow indicator on hover */}
                <div className="mt-auto pt-4 flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>{tm('viewModule') || 'View'}</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats - Card with themed elevation */}
      <div className="card-elevated-themed p-fluid">
        <h2 className="text-lg sm:text-xl font-bold mb-4 section-header-themed">{tm('quickStats')}</h2>
        <div className="text-center text-muted-foreground">
          <p>{tm('clickModulePrompt')}</p>
        </div>
      </div>
    </div>
  )
}
