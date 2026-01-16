'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Trash2, Edit, Briefcase, DollarSign, FileText, AlertCircle,
  CheckCircle, Clock, XCircle, MessageSquare, User, MapPin, Phone, Filter, Star,
  ChevronDown, ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { AdvancePaymentsSection } from '@/components/vendors/advance-payments-section'

export default function VendorsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('vendors')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<any>(null)
  const [commentDialogVendor, setCommentDialogVendor] = useState<any>(null)
  const [approvalDialogVendor, setApprovalDialogVendor] = useState<any>(null)
  const [newComment, setNewComment] = useState('')
  const [approvalComment, setApprovalComment] = useState('')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Toggle section collapse
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey)
      } else {
        newSet.add(sectionKey)
      }
      return newSet
    })
  }

  const [formData, setFormData] = useState({
    vendorName: '',
    category: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    contractSigned: false,
    contractDate: '',
    cost: '',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'overdue',
    notes: '',
    // Enhanced fields
    eventId: '',
    venueAddress: '',
    onsitePocName: '',
    onsitePocPhone: '',
    onsitePocNotes: '',
    deliverables: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: vendors, isLoading } = trpc.vendors.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.vendors.getStats.useQuery({
    clientId: clientId,
  })

  const { data: events } = trpc.vendors.getClientEvents.useQuery({
    clientId: clientId,
  })

  const { data: comments } = trpc.vendors.getComments.useQuery(
    { clientVendorId: commentDialogVendor?.id },
    { enabled: !!commentDialogVendor }
  )

  // Category label mapping
  const getCategoryLabel = (category: string): string => {
    const labelMap: Record<string, string> = {
      'venue': t('categoryVenue') || 'Venue',
      'catering': t('categoryCatering') || 'Catering',
      'photography': t('categoryPhotography') || 'Photography',
      'videography': t('categoryVideography') || 'Videography',
      'florals': t('categoryFlorals') || 'Florals',
      'music': t('categoryMusic') || 'Music',
      'dj': t('categoryDj') || 'DJ',
      'transportation': t('categoryTransportation') || 'Transportation',
      'accommodation': t('categoryAccommodation') || 'Accommodation',
      'beauty': t('categoryBeauty') || 'Beauty & Makeup',
      'bakery': t('categoryBakery') || 'Bakery & Cake',
      'decor': t('categoryDecor') || 'Decor',
      'entertainment': t('categoryEntertainment') || 'Entertainment',
      'stationery': t('categoryStationery') || 'Stationery',
      'rentals': t('categoryRentals') || 'Rentals',
      'other': t('categoryOther') || 'Other',
    }
    return labelMap[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  // Get unique vendor types (service types) from vendor names
  // When auto-created from client form, vendor.name contains the service type (e.g., "dj", "decorator")
  const uniqueVendorTypes = useMemo(() => {
    if (!vendors) return [] as string[]
    const vendorTypes = vendors
      .map(v => v.name)
      .filter((name): name is NonNullable<typeof name> => name !== null && name !== undefined && name !== '')
    return [...new Set(vendorTypes)].sort()
  }, [vendors])

  // Filter vendors by event AND category
  const filteredVendors = useMemo(() => {
    if (!vendors) return []
    let filtered = vendors

    // Apply event filter
    if (eventFilter === 'unassigned') {
      filtered = filtered.filter(v => !v.event_id)
    } else if (eventFilter !== 'all') {
      filtered = filtered.filter(v => v.event_id === eventFilter)
    }

    // Apply vendor type filter (filters by vendor name/service type)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(v => v.name === categoryFilter)
    }

    return filtered
  }, [vendors, eventFilter, categoryFilter])

  // Group vendors by event for "All Events" view (respects category filter)
  const vendorsByEvent = useMemo(() => {
    if (!vendors || eventFilter !== 'all') return null

    // Apply vendor type filter first (filters by vendor name/service type)
    let vendorsToGroup = vendors
    if (categoryFilter !== 'all') {
      vendorsToGroup = vendors.filter(v => v.name === categoryFilter)
    }

    const grouped: Record<string, { eventTitle: string; eventDate: string | null; vendors: typeof vendors }> = {}

    // Group by event
    vendorsToGroup.forEach(vendor => {
      const eventKey = vendor.event_id || 'unassigned'
      const eventTitle = vendor.event_title || t('unassignedVendors')
      const eventDate = vendor.event_date || null

      if (!grouped[eventKey]) {
        grouped[eventKey] = { eventTitle, eventDate, vendors: [] }
      }
      grouped[eventKey].vendors.push(vendor)
    })

    // Sort by event date, unassigned last
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === 'unassigned') return 1
      if (b[0] === 'unassigned') return -1
      const dateA = a[1].eventDate || ''
      const dateB = b[1].eventDate || ''
      return dateA.localeCompare(dateB)
    })
  }, [vendors, eventFilter, categoryFilter, t])

  // Group vendors by vendor type for filter view when vendor type is selected
  const vendorsByCategory = useMemo(() => {
    if (!vendors || categoryFilter === 'all') return null

    // Apply vendor type filter first (filters by vendor name/service type)
    let vendorsToGroup = vendors.filter(v => v.name === categoryFilter)
    if (eventFilter === 'unassigned') {
      vendorsToGroup = vendorsToGroup.filter(v => !v.event_id)
    } else if (eventFilter !== 'all') {
      vendorsToGroup = vendorsToGroup.filter(v => v.event_id === eventFilter)
    }

    // Group by event
    const grouped: Record<string, { eventTitle: string; eventDate: string | null; vendors: typeof vendors }> = {}

    vendorsToGroup.forEach(vendor => {
      const eventKey = vendor.event_id || 'unassigned'
      const eventTitle = vendor.event_title || t('unassignedVendors')
      const eventDate = vendor.event_date || null

      if (!grouped[eventKey]) {
        grouped[eventKey] = { eventTitle, eventDate, vendors: [] }
      }
      grouped[eventKey].vendors.push(vendor)
    })

    // Sort by event date, unassigned last
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === 'unassigned') return 1
      if (b[0] === 'unassigned') return -1
      const dateA = a[1].eventDate || ''
      const dateB = b[1].eventDate || ''
      return dateA.localeCompare(dateB)
    })
  }, [vendors, eventFilter, categoryFilter, t])

  // Mutations - all use async/await for proper cache invalidation
  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('vendorAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.vendors.getAll.invalidate({ clientId }),
        utils.vendors.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.vendors.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('vendorUpdated') })
      setEditingVendor(null)
      resetForm()
      await Promise.all([
        utils.vendors.getAll.invalidate({ clientId }),
        utils.vendors.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.vendors.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('vendorDeleted') })
      await Promise.all([
        utils.vendors.getAll.invalidate({ clientId }),
        utils.vendors.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const approvalMutation = trpc.vendors.updateApprovalStatus.useMutation({
    onSuccess: async () => {
      toast({ title: t('approvalStatusUpdated') })
      setApprovalDialogVendor(null)
      setApprovalComment('')
      await Promise.all([
        utils.vendors.getAll.invalidate({ clientId }),
        utils.vendors.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const addCommentMutation = trpc.vendors.addComment.useMutation({
    onSuccess: async () => {
      toast({ title: t('commentAdded') })
      setNewComment('')
      await utils.vendors.getComments.invalidate()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      vendorName: '',
      category: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      contractSigned: false,
      contractDate: '',
      cost: '',
      paymentStatus: 'pending',
      notes: '',
      eventId: '',
      venueAddress: '',
      onsitePocName: '',
      onsitePocPhone: '',
      onsitePocNotes: '',
      deliverables: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      eventId: formData.eventId || undefined,
    }

    if (editingVendor) {
      updateMutation.mutate({
        id: editingVendor.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor)
    setFormData({
      vendorName: vendor.name || '',
      category: vendor.category || '',
      contactName: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      contractSigned: vendor.contract_signed || false,
      contractDate: vendor.contract_date || '',
      cost: vendor.contract_amount?.toString() || '',
      paymentStatus: vendor.payment_status || 'pending',
      notes: vendor.notes || '',
      eventId: vendor.event_id || '',
      venueAddress: vendor.venue_address || '',
      onsitePocName: vendor.onsite_poc_name || '',
      onsitePocPhone: vendor.onsite_poc_phone || '',
      onsitePocNotes: vendor.onsite_poc_notes || '',
      deliverables: vendor.deliverables || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleApproval = (status: 'approved' | 'rejected') => {
    if (approvalDialogVendor) {
      approvalMutation.mutate({
        id: approvalDialogVendor.id,
        status,
        comments: approvalComment,
      })
    }
  }

  const handleAddComment = () => {
    if (commentDialogVendor && newComment.trim()) {
      addCommentMutation.mutate({
        clientVendorId: commentDialogVendor.id,
        comment: newComment,
        userType: 'planner',
      })
    }
  }

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-sage-100 text-sage-700"><CheckCircle className="w-3 h-3 mr-1" />{t('approved')}</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700"><XCircle className="w-3 h-3 mr-1" />{t('rejected')}</Badge>
      default:
        return <Badge className="bg-gold-100 text-gold-700"><Clock className="w-3 h-3 mr-1" />{tc('pending')}</Badge>
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
        <p>{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <ClientModuleHeader
        title={t('vendorManagement')}
        description={t('manageVendorsApproval')}
      >
        <ExportButton
          data={vendors || []}
          dataType="vendors"
          onExportComplete={(format) => {
            toast({ title: t('vendorsExported', { format: format.toUpperCase() }) })
          }}
        />
        <ImportDialog
          module="vendors"
          clientId={clientId}
          onImportComplete={() => {
            utils.vendors.getAll.invalidate()
            utils.vendors.getStats.invalidate()
            toast({ title: tc('importCompleted') })
          }}
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addVendor')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title={tc('total')} value={stats?.total || 0} icon={<Briefcase className="w-4 h-4" />} />
        <StatCard title={t('totalCost')} value={`$${stats?.totalCost?.toLocaleString() || 0}`} icon={<DollarSign className="w-4 h-4" />} color="text-cobalt-600" />
        <StatCard title={t('paid')} value={`$${stats?.paidAmount?.toLocaleString() || 0}`} color="text-sage-600" />
        <StatCard title={t('approved')} value={stats?.approved || 0} icon={<CheckCircle className="w-4 h-4" />} color="text-sage-600" />
        <StatCard title={t('pendingApproval')} value={stats?.approvalPending || 0} icon={<Clock className="w-4 h-4" />} color="text-gold-600" />
        <StatCard title={t('overdue')} value={stats?.paymentOverdue || 0} icon={<AlertCircle className="w-4 h-4" />} color="text-rose-600" />
      </div>

      {/* Filters - Event & Category */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />

        {/* Vendor Type Filter - filters by vendor name/service type (e.g., "dj", "decorator") */}
        {uniqueVendorTypes.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('filterByVendorType') || 'Filter by vendor type'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allVendorTypes') || 'All Vendor Types'}</SelectItem>
              {uniqueVendorTypes.map((vendorType) => (
                <SelectItem key={vendorType} value={vendorType}>
                  {vendorType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Event Filter */}
        {events && events.length > 0 && (
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t('filterByEvent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allEvents')}</SelectItem>
              <SelectItem value="unassigned">{t('unassignedVendors')}</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title} ({event.event_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {(eventFilter !== 'all' || categoryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEventFilter('all')
              setCategoryFilter('all')
            }}
          >
            {tc('clearFilter') || 'Clear filters'}
          </Button>
        )}

        {/* Active filter badges */}
        {categoryFilter !== 'all' && (
          <Badge variant="secondary" className="bg-teal-100 text-teal-700">
            {t('vendorType') || 'Vendor Type'}: {categoryFilter}
          </Badge>
        )}
      </div>

      {/* Vendor List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {categoryFilter !== 'all'
                  ? `${categoryFilter} ${t('vendorsFiltered') || 'Vendors'}`
                  : t('allVendors')}
              </CardTitle>
              {categoryFilter !== 'all' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('showingAllVendorTypeVendors', { vendorType: categoryFilter }) || `Showing all "${categoryFilter}" vendors across events`}
                </p>
              )}
            </div>
            {(eventFilter !== 'all' || categoryFilter !== 'all') && (
              <Badge variant="secondary">
                {filteredVendors.length} {filteredVendors.length === 1 ? t('vendor') : t('vendorsFiltered')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {categoryFilter !== 'all'
                ? `${t('noVendorsOfType') || 'No vendors found of type'} "${categoryFilter}"`
                : t('noVendorsYet')}
            </div>
          ) : categoryFilter !== 'all' && vendorsByCategory ? (
            /* Category filter active - Group by Event to show category across events */
            <div className="space-y-6">
              {vendorsByCategory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('noVendorsOfType') || 'No vendors found of this type'}
                </div>
              ) : (
                vendorsByCategory.map(([eventKey, { eventTitle, eventDate, vendors: eventVendors }]) => {
                  const isCollapsed = collapsedSections.has(`cat-${eventKey}`)
                  return (
                    <div key={eventKey} className="space-y-3">
                      {/* Event Header - Collapsible */}
                      <button
                        onClick={() => toggleSection(`cat-${eventKey}`)}
                        className="w-full flex items-center justify-between border-b pb-2 bg-teal-50/50 dark:bg-teal-900/20 p-3 rounded-t-lg -mx-3 hover:bg-teal-100/50 dark:hover:bg-teal-900/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="w-5 h-5 text-teal-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-teal-600" />
                          )}
                          <h3 className="font-semibold text-lg">{eventTitle}</h3>
                          {eventDate && (
                            <Badge variant="outline" className="text-xs">
                              {eventDate}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                          {eventVendors.length} {categoryFilter}
                        </Badge>
                      </button>

                      {/* Vendors for this event - Collapsible content */}
                      {!isCollapsed && (
                        <div className="space-y-3 pl-2 border-l-2 border-teal-200 dark:border-teal-800">
                          {eventVendors.map((vendor) => (
                            <VendorCard
                              key={vendor.id}
                              vendor={vendor}
                              t={t}
                              tc={tc}
                              getApprovalBadge={getApprovalBadge}
                              handleEdit={handleEdit}
                              handleDelete={handleDelete}
                              setCommentDialogVendor={setCommentDialogVendor}
                              setApprovalDialogVendor={setApprovalDialogVendor}
                              showEventBadge={false}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : eventFilter === 'all' && vendorsByEvent ? (
            /* Grouped by Event View (no category filter) */
            <div className="space-y-6">
              {vendorsByEvent.map(([eventKey, { eventTitle, eventDate, vendors: eventVendors }]) => {
                const isCollapsed = collapsedSections.has(`event-${eventKey}`)
                return (
                  <div key={eventKey} className="space-y-3">
                    {/* Event Header - Collapsible */}
                    <button
                      onClick={() => toggleSection(`event-${eventKey}`)}
                      className="w-full flex items-center justify-between border-b pb-2 hover:bg-muted/50 p-2 rounded-t-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold text-lg">{eventTitle}</h3>
                        {eventDate && (
                          <Badge variant="outline" className="text-xs">
                            {eventDate}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {eventVendors.length} {eventVendors.length === 1 ? t('vendor') : t('vendorsFiltered')}
                      </Badge>
                    </button>

                    {/* Vendors for this event - Collapsible content */}
                    {!isCollapsed && (
                      <div className="space-y-3 pl-2 border-l-2 border-muted">
                        {eventVendors.map((vendor) => (
                          <VendorCard
                            key={vendor.id}
                            vendor={vendor}
                            t={t}
                            tc={tc}
                            getApprovalBadge={getApprovalBadge}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            setCommentDialogVendor={setCommentDialogVendor}
                            setApprovalDialogVendor={setApprovalDialogVendor}
                            showEventBadge={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Flat List View (when event filtered) */
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  t={t}
                  tc={tc}
                  getApprovalBadge={getApprovalBadge}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  setCommentDialogVendor={setCommentDialogVendor}
                  setApprovalDialogVendor={setApprovalDialogVendor}
                  showEventBadge={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingVendor}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingVendor(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? t('editVendor') : t('addNewVendor')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendorName">{t('vendorName')} *</Label>
                <Input
                  id="vendorName"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">{t('vendorType')} *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('vendorTypePlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactName">{t('contactName')}</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">{tc('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">{tc('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="eventId">{t('eventAssignment')}</Label>
                <Select
                  value={formData.eventId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, eventId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noEventSelected')}</SelectItem>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} ({event.event_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Venue Address */}
            <div>
              <Label htmlFor="venueAddress">{t('venueAddress')}</Label>
              <Input
                id="venueAddress"
                value={formData.venueAddress}
                onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                placeholder={t('venueAddressPlaceholder')}
              />
            </div>

            {/* On-site POC */}
            <div className="border rounded-lg p-4 bg-cobalt-50/50">
              <h4 className="font-medium mb-3">{t('onsitePocCompany')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="onsitePocName">{t('pocName')}</Label>
                  <Input
                    id="onsitePocName"
                    value={formData.onsitePocName}
                    onChange={(e) => setFormData({ ...formData, onsitePocName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="onsitePocPhone">{t('pocPhone')}</Label>
                  <Input
                    id="onsitePocPhone"
                    value={formData.onsitePocPhone}
                    onChange={(e) => setFormData({ ...formData, onsitePocPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="onsitePocNotes">{t('pocNotes')}</Label>
                <Input
                  id="onsitePocNotes"
                  value={formData.onsitePocNotes}
                  onChange={(e) => setFormData({ ...formData, onsitePocNotes: e.target.value })}
                />
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <Label htmlFor="deliverables">{t('deliverablesBullets')}</Label>
              <Textarea
                id="deliverables"
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
                rows={4}
              />
            </div>

            {/* Contract Amount */}
            <div>
              <Label htmlFor="cost">{t('contractAmount')}</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Advance Payments - only show when editing existing vendor */}
            {editingVendor && (
              <AdvancePaymentsSection
                vendorId={editingVendor.vendor_id || editingVendor.id}
                clientId={clientId}
                contractAmount={parseFloat(formData.cost) || 0}
              />
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{tc('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingVendor(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingVendor ? tc('update') : tc('add')} {t('vendor')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={!!commentDialogVendor} onOpenChange={(open) => !open && setCommentDialogVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('comments')} - {commentDialogVendor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {comments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('noCommentsYet')}</p>
              ) : (
                comments?.map((comment: any) => (
                  <div key={comment.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{comment.user_name || comment.user_type}</span>
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('addCommentPlaceholder')}
              />
              <Button onClick={handleAddComment} disabled={addCommentMutation.isPending}>
                {t('send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialogVendor} onOpenChange={(open) => {
        if (!open) {
          setApprovalDialogVendor(null)
          setApprovalComment('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval')} - {approvalDialogVendor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('currentStatus')}</Label>
              <div className="mt-1">{getApprovalBadge(approvalDialogVendor?.approval_status || 'pending')}</div>
            </div>
            <div>
              <Label htmlFor="approvalComment">{t('approvalComments')}</Label>
              <Textarea
                id="approvalComment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={t('approvalCommentsPlaceholder')}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-sage-600 hover:bg-sage-700"
                onClick={() => handleApproval('approved')}
                disabled={approvalMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('approve')}
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleApproval('rejected')}
                disabled={approvalMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('reject')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color = 'text-foreground',
}: {
  title: string
  value: number | string
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function VendorCard({
  vendor,
  t,
  tc,
  getApprovalBadge,
  handleEdit,
  handleDelete,
  setCommentDialogVendor,
  setApprovalDialogVendor,
  showEventBadge,
}: {
  vendor: any
  t: any
  tc: any
  getApprovalBadge: (status: string) => React.ReactNode
  handleEdit: (vendor: any) => void
  handleDelete: (id: string) => void
  setCommentDialogVendor: (vendor: any) => void
  setApprovalDialogVendor: (vendor: any) => void
  showEventBadge: boolean
}) {
  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{vendor.name}</h3>
            {vendor.is_preferred && (
              <Badge className="bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400">
                <Star className="w-3 h-3 mr-1 fill-current" />{t('preferred')}
              </Badge>
            )}
            {vendor.category && vendor.category !== 'other' && (
              <Badge variant="outline">{vendor.category}</Badge>
            )}
            {getApprovalBadge(vendor.approval_status || 'pending')}
            {showEventBadge && vendor.event_title && (
              <Badge variant="secondary">{vendor.event_title}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Contact Info */}
            <div className="space-y-1">
              {vendor.contact_name && (
                <p className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {vendor.contact_name}
                </p>
              )}
              {vendor.phone && (
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {vendor.phone}
                </p>
              )}
              {vendor.email && <p className="text-muted-foreground">{vendor.email}</p>}
            </div>

            {/* On-site POC */}
            {vendor.onsite_poc_name && (
              <div className="space-y-1 bg-cobalt-50 dark:bg-cobalt-900/20 p-2 rounded">
                <p className="font-medium text-cobalt-700 dark:text-cobalt-400">{t('onsitePoc')}</p>
                <p>{vendor.onsite_poc_name}</p>
                {vendor.onsite_poc_phone && <p>{vendor.onsite_poc_phone}</p>}
                {vendor.onsite_poc_notes && (
                  <p className="text-xs text-muted-foreground">{vendor.onsite_poc_notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Venue & Deliverables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {vendor.venue_address && (
              <p className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {vendor.venue_address}
              </p>
            )}
            {vendor.deliverables && (
              <div className="bg-mocha-50 dark:bg-mocha-800 p-2 rounded">
                <p className="font-medium mb-1">{t('deliverables')}:</p>
                <p className="whitespace-pre-wrap text-xs">{vendor.deliverables}</p>
              </div>
            )}
          </div>

          {/* Approval Comments */}
          {vendor.approval_comments && (
            <div className="bg-gold-50 dark:bg-gold-900/20 p-2 rounded text-sm">
              <p className="font-medium">{t('approvalComments')}:</p>
              <p>{vendor.approval_comments}</p>
            </div>
          )}

          {/* Payment Info with Advances */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              {t('cost')}: <strong>${Number(vendor.contract_amount || 0).toLocaleString()}</strong>
            </span>
            <span>
              {t('paid') || 'Paid'}:{' '}
              <span className="text-sage-600 font-medium">
                ${Number(vendor.total_advances || 0).toLocaleString()}
              </span>
            </span>
            <span>
              {t('remaining') || 'Balance'}:{' '}
              <span className={`font-medium ${
                Number(vendor.balance_remaining || 0) === 0 ? 'text-sage-600' :
                Number(vendor.balance_remaining || 0) < 0 ? 'text-rose-600' : 'text-gold-600'
              }`}>
                ${Number(vendor.balance_remaining || 0).toLocaleString()}
              </span>
            </span>
            {Number(vendor.total_advances || 0) > 0 && Number(vendor.contract_amount || 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {Math.round((Number(vendor.total_advances) / Number(vendor.contract_amount)) * 100)}% paid
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCommentDialogVendor(vendor)}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApprovalDialogVendor(vendor)}
            className={vendor.approval_status === 'pending' ? 'border-gold-500' : ''}
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(vendor.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
