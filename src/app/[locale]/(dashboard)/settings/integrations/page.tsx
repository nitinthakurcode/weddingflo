'use client'

/**
 * Integrations Settings Page
 * December 2025 - WeddingFlo
 *
 * Manages third-party integrations: QuickBooks, Zapier, and competitor imports.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { trpc } from '@/lib/trpc/client'
import { useSearchParams } from 'next/navigation'
import {
  Calculator,
  Zap,
  Upload,
  Check,
  X,
  Copy,
  RefreshCw,
  ExternalLink,
  Settings,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

// =====================================================
// QuickBooks Section
// =====================================================

function QuickBooksIntegration() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Check for OAuth callback results
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'quickbooks_connected') {
      toast({
        title: 'QuickBooks Connected',
        description: 'Your QuickBooks account has been successfully connected.',
      })
    } else if (error) {
      const errorMessages: Record<string, string> = {
        quickbooks_denied: 'QuickBooks connection was denied.',
        quickbooks_invalid_response: 'Invalid response from QuickBooks.',
        quickbooks_invalid_state: 'Security validation failed.',
        quickbooks_connection_failed: 'Failed to connect to QuickBooks.',
      }
      toast({
        title: 'Connection Failed',
        description: errorMessages[error] || 'An unknown error occurred.',
        variant: 'destructive',
      })
    }
  }, [searchParams, toast])

  // Get connection status
  const { data: connection, refetch } = trpc.integrations.getQuickBooksConnection.useQuery()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Generate authorization URL
      const state = crypto.randomUUID()
      localStorage.setItem('qb_oauth_state', state)

      const clientId = process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID
      const redirectUri = `${window.location.origin}/api/integrations/quickbooks/callback`
      const scopes = 'com.intuit.quickbooks.accounting'

      const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

      window.location.href = authUrl
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Failed to initiate QuickBooks connection.',
        variant: 'destructive',
      })
      setIsConnecting(false)
    }
  }

  const disconnectMutation = trpc.integrations.disconnectQuickBooks.useMutation({
    onSuccess: () => {
      toast({ title: 'Disconnected', description: 'QuickBooks has been disconnected.' })
      refetch()
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to disconnect.', variant: 'destructive' })
    },
    onSettled: () => setIsDisconnecting(false),
  })

  const handleDisconnect = () => {
    if (!connection?.id) return
    setIsDisconnecting(true)
    disconnectMutation.mutate({ connectionId: connection.id })
  }

  const syncMutation = trpc.integrations.syncQuickBooks.useMutation({
    onSuccess: (result) => {
      toast({
        title: 'Sync Complete',
        description: `Created: ${result.created}, Updated: ${result.updated}`,
      })
    },
    onError: () => {
      toast({ title: 'Sync Failed', description: 'Could not sync with QuickBooks.', variant: 'destructive' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sage-100 dark:bg-sage-900/20">
            <Calculator className="h-6 w-6 text-sage-600 dark:text-sage-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              QuickBooks Online
              {connection?.isActive && (
                <Badge variant="default" className="bg-sage-600">Connected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sync invoices, payments, and expenses with QuickBooks
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.isActive ? (
          <>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Realm ID</span>
                <span className="font-mono">{connection.realmId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Synced</span>
                <span>
                  {connection.lastSyncAt
                    ? new Date(connection.lastSyncAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token Expires</span>
                <span>
                  {connection.expiresAt
                    ? new Date(connection.expiresAt).toLocaleString()
                    : 'Unknown'}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks Online account to automatically sync invoices,
              payments, and client data.
            </p>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">What gets synced:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-sage-600" />
                  Clients → QuickBooks Customers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-sage-600" />
                  Invoices → QuickBooks Invoices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-sage-600" />
                  Payments received → QuickBooks Payments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-sage-600" />
                  Budget expenses → QuickBooks Expenses
                </li>
              </ul>
            </div>

            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect QuickBooks
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================================
// Automation Integration Component (Zapier, Make, n8n)
// =====================================================

type AutomationPlatform = 'zapier' | 'make' | 'n8n'

interface AutomationIntegrationProps {
  platform: AutomationPlatform
  name: string
  description: string
  icon: React.ReactNode
  bgColor: string
  webhookPath: string
  docsUrl: string
}

function AutomationIntegration({
  platform,
  name,
  description,
  icon,
  bgColor,
  webhookPath,
  docsUrl,
}: AutomationIntegrationProps) {
  const { toast } = useToast()
  const [showApiKey, setShowApiKey] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: apiKey, refetch: refetchApiKey } = trpc.integrations.getApiKey.useQuery({
    service: platform,
  })

  const generateKeyMutation = trpc.integrations.generateApiKey.useMutation({
    onSuccess: () => {
      toast({ title: 'API Key Generated', description: 'Your new API key has been created.' })
      refetchApiKey()
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate API key.', variant: 'destructive' })
    },
    onSettled: () => setIsGenerating(false),
  })

  const revokeKeyMutation = trpc.integrations.revokeApiKey.useMutation({
    onSuccess: () => {
      toast({ title: 'API Key Revoked', description: 'Your API key has been revoked.' })
      refetchApiKey()
    },
  })

  const handleCopyKey = () => {
    if (apiKey?.key) {
      navigator.clipboard.writeText(apiKey.key)
      toast({ title: 'Copied', description: 'API key copied to clipboard.' })
    }
  }

  const triggers = [
    { event: 'client.created', description: 'When a new client is created' },
    { event: 'guest.added', description: 'When a guest is added to an event' },
    { event: 'payment.received', description: 'When a payment is received' },
    { event: 'invoice.sent', description: 'When an invoice is sent' },
    { event: 'rsvp.updated', description: 'When a guest RSVP is updated' },
    { event: 'document.signed', description: 'When a document is e-signed' },
    { event: 'task.completed', description: 'When a task is completed' },
  ]

  const actions = [
    { action: 'create_client', description: 'Create a new client' },
    { action: 'add_guest', description: 'Add a guest to an event' },
    { action: 'create_task', description: 'Create a new task' },
    { action: 'send_notification', description: 'Send an email notification' },
    { action: 'update_rsvp', description: 'Update guest RSVP status' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${bgColor}`}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {name}
              {apiKey?.isActive && (
                <Badge variant="default" className="bg-sage-600">Active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Key Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">API Key</h4>
          {apiKey?.key ? (
            <div className="flex items-center gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey.key}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleCopyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                setIsGenerating(true)
                generateKeyMutation.mutate({ service: platform, name: `${name} Integration` })
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                icon
              )}
              <span className="ml-2">Generate API Key</span>
            </Button>
          )}
          {apiKey?.key && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeKeyMutation.mutate({ keyId: apiKey.id })}
              disabled={revokeKeyMutation.isPending}
            >
              Revoke Key
            </Button>
          )}
        </div>

        <Separator />

        {/* Webhook Endpoint */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Webhook Endpoint</h4>
          <div className="flex items-center gap-2">
            <Input
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/${webhookPath}/subscribe`}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/integrations/${webhookPath}/subscribe`)
                toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' })
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Available Triggers & Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Available Triggers</h4>
            <div className="space-y-2">
              {triggers.map((t) => (
                <div key={t.event} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-xs">
                    {t.event}
                  </Badge>
                  <span className="text-muted-foreground">{t.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Available Actions</h4>
            <div className="space-y-2">
              {actions.map((a) => (
                <div key={a.action} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-xs">
                    {a.action}
                  </Badge>
                  <span className="text-muted-foreground">{a.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================================
// Wrapper Components for each platform
// =====================================================

function ZapierIntegration() {
  return (
    <AutomationIntegration
      platform="zapier"
      name="Zapier"
      description="Connect WeddingFlo to 6,000+ apps via Zapier"
      icon={<Zap className="h-6 w-6 text-gold-600 dark:text-gold-400" />}
      bgColor="bg-gold-100 dark:bg-gold-900/20"
      webhookPath="zapier"
      docsUrl="https://zapier.com/apps"
    />
  )
}

function MakeIntegration() {
  return (
    <AutomationIntegration
      platform="make"
      name="Make (Integromat)"
      description="Build powerful automations with Make's visual workflow builder"
      icon={<Settings className="h-6 w-6 text-teal-600 dark:text-teal-400" />}
      bgColor="bg-teal-100 dark:bg-teal-900/20"
      webhookPath="make"
      docsUrl="https://www.make.com/en/integrations"
    />
  )
}

function N8nIntegration() {
  return (
    <AutomationIntegration
      platform="n8n"
      name="n8n"
      description="Open-source workflow automation - self-host or use cloud"
      icon={<RefreshCw className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
      bgColor="bg-rose-100 dark:bg-rose-900/20"
      webhookPath="n8n"
      docsUrl="https://n8n.io/integrations"
    />
  )
}

// =====================================================
// Competitor Import Wizard
// =====================================================

type ImportPlatform = 'honeybook' | 'dubsado' | 'aisle_planner' | 'planning_pod' | 'generic'
type ImportDataType = 'guests' | 'clients' | 'vendors'
type ImportStep = 'platform' | 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

interface FieldMapping {
  sourceColumn: string
  targetField: string | null
  confidence: number
  isAutoMapped: boolean
}

interface ImportPreview {
  valid: number
  invalid: number
  duplicates: number
  rows: Array<{
    data: Record<string, unknown>
    errors: string[]
    isDuplicate: boolean
  }>
}

function CompetitorImportWizard() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>('platform')
  const [platform, setPlatform] = useState<ImportPlatform | null>(null)
  const [dataType, setDataType] = useState<ImportDataType>('guests')
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    skipped: number
    failed: number
  } | null>(null)

  const platforms = [
    {
      id: 'honeybook' as const,
      name: 'HoneyBook',
      description: 'Import clients and vendors from HoneyBook',
      supports: ['clients', 'vendors'],
    },
    {
      id: 'dubsado' as const,
      name: 'Dubsado',
      description: 'Import clients and vendors from Dubsado',
      supports: ['clients', 'vendors'],
    },
    {
      id: 'aisle_planner' as const,
      name: 'Aisle Planner',
      description: 'Import guests, clients, and vendors',
      supports: ['guests', 'clients', 'vendors'],
    },
    {
      id: 'planning_pod' as const,
      name: 'Planning Pod',
      description: 'Import guests, clients, and vendors',
      supports: ['guests', 'clients', 'vendors'],
    },
    {
      id: 'generic' as const,
      name: 'Generic CSV',
      description: 'Import from any CSV file with manual mapping',
      supports: ['guests', 'clients', 'vendors'],
    },
  ]

  const targetFields: Record<ImportDataType, Array<{ id: string; label: string; required: boolean }>> = {
    guests: [
      { id: 'firstName', label: 'First Name', required: true },
      { id: 'lastName', label: 'Last Name', required: true },
      { id: 'email', label: 'Email', required: false },
      { id: 'phone', label: 'Phone', required: false },
      { id: 'groupName', label: 'Group', required: false },
      { id: 'rsvpStatus', label: 'RSVP Status', required: false },
      { id: 'mealPreference', label: 'Meal Preference', required: false },
      { id: 'notes', label: 'Notes', required: false },
    ],
    clients: [
      { id: 'name', label: 'Client Name', required: true },
      { id: 'email', label: 'Email', required: false },
      { id: 'phone', label: 'Phone', required: false },
      { id: 'eventDate', label: 'Event Date', required: false },
      { id: 'budget', label: 'Budget', required: false },
      { id: 'notes', label: 'Notes', required: false },
    ],
    vendors: [
      { id: 'vendorName', label: 'Vendor Name', required: true },
      { id: 'vendorType', label: 'Vendor Type', required: true },
      { id: 'contactName', label: 'Contact Name', required: false },
      { id: 'email', label: 'Email', required: false },
      { id: 'phone', label: 'Phone', required: false },
      { id: 'agreedPrice', label: 'Agreed Price', required: false },
      { id: 'notes', label: 'Notes', required: false },
    ],
  }

  const parseCSVMutation = trpc.integrations.parseImportFile.useMutation({
    onSuccess: (result) => {
      setColumns(result.columns)
      setMappings(result.mappings)
      setStep('mapping')
    },
    onError: (error) => {
      toast({
        title: 'Parse Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const previewMutation = trpc.integrations.previewImport.useMutation({
    onSuccess: (result) => {
      setPreview(result)
      setStep('preview')
    },
    onError: (error) => {
      toast({
        title: 'Preview Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const importMutation = trpc.integrations.executeImport.useMutation({
    onSuccess: (result) => {
      setImportResult(result)
      setStep('complete')
    },
    onError: (error) => {
      toast({
        title: 'Import Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)

    const formData = new FormData()
    formData.append('file', uploadedFile)
    formData.append('platform', platform || 'generic')
    formData.append('dataType', dataType)

    // Read file content
    const text = await uploadedFile.text()
    parseCSVMutation.mutate({
      fileContent: text,
      platform: platform || 'generic',
      dataType,
    })
  }

  const handleMappingChange = (sourceColumn: string, targetField: string | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField, isAutoMapped: false }
          : m
      )
    )
  }

  const handlePreview = () => {
    if (!file) return

    file.text().then((content) => {
      previewMutation.mutate({
        fileContent: content,
        mappings,
        dataType,
      })
    })
  }

  const handleImport = () => {
    if (!file) return

    setStep('importing')
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return prev
        }
        return prev + 5
      })
    }, 200)

    file.text().then((content) => {
      importMutation.mutate(
        {
          fileContent: content,
          mappings,
          dataType,
          duplicateAction: 'skip',
        },
        {
          onSettled: () => {
            clearInterval(interval)
            setProgress(100)
          },
        }
      )
    })
  }

  const resetWizard = () => {
    setStep('platform')
    setPlatform(null)
    setFile(null)
    setColumns([])
    setMappings([])
    setPreview(null)
    setProgress(0)
    setImportResult(null)
  }

  const stepIndicators = [
    { key: 'platform', label: 'Platform' },
    { key: 'upload', label: 'Upload' },
    { key: 'mapping', label: 'Mapping' },
    { key: 'preview', label: 'Preview' },
    { key: 'importing', label: 'Import' },
  ]

  const currentStepIndex = stepIndicators.findIndex((s) => s.key === step)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cobalt-100 dark:bg-cobalt-900/20">
              <Upload className="h-6 w-6 text-cobalt-600 dark:text-cobalt-400" />
            </div>
            <div className="flex-1">
              <CardTitle>Import from Competitors</CardTitle>
              <CardDescription>
                Migrate data from HoneyBook, Dubsado, Aisle Planner, or any CSV file
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Easily migrate your existing client, guest, and vendor data from other wedding planning platforms.
              Our smart mapper automatically detects columns and handles duplicates.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sage-600" />
                <span>Auto-detect columns</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sage-600" />
                <span>Fuzzy duplicate detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sage-600" />
                <span>Data validation</span>
              </div>
            </div>

            <Button onClick={() => setIsOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Start Import Wizard
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetWizard(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Data Wizard</DialogTitle>
            <DialogDescription>
              {step === 'complete'
                ? 'Import completed successfully!'
                : `Step ${currentStepIndex + 1} of ${stepIndicators.length}: ${stepIndicators[currentStepIndex]?.label}`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicators */}
          {step !== 'complete' && (
            <div className="flex items-center justify-center gap-2 py-4">
              {stepIndicators.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      i < currentStepIndex
                        ? 'bg-sage-600 text-white'
                        : i === currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < stepIndicators.length - 1 && (
                    <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step: Platform Selection */}
          {step === 'platform' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Select Data Type</h4>
                <div className="flex gap-2">
                  {(['guests', 'clients', 'vendors'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={dataType === type ? 'default' : 'outline'}
                      onClick={() => setDataType(type)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Select Source Platform</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {platforms
                    .filter((p) => p.supports.includes(dataType))
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                          platform === p.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setPlatform(p.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border ${
                              platform === p.id
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground'
                            }`}
                          />
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground pl-6">
                          {p.description}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: File Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Export your data first</AlertTitle>
                <AlertDescription>
                  {platform === 'honeybook' && 'In HoneyBook, go to Settings → Data Export → Export Contacts'}
                  {platform === 'dubsado' && 'In Dubsado, go to Settings → Export → Export Clients'}
                  {platform === 'aisle_planner' && 'In Aisle Planner, go to Tools → Export → Download CSV'}
                  {platform === 'planning_pod' && 'In Planning Pod, go to Reports → Guest List → Export CSV'}
                  {platform === 'generic' && 'Export your data as a CSV file with headers in the first row'}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Upload your CSV file</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop or click to select
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs"
                />
                {parseCSVMutation.isPending && (
                  <div className="flex items-center gap-2 mt-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Parsing file...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Field Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map your CSV columns to WeddingFlo fields. Auto-mapped columns are highlighted in green.
              </p>

              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Your Column</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Maps To</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((mapping) => (
                      <tr
                        key={mapping.sourceColumn}
                        className={`border-t ${mapping.isAutoMapped && mapping.confidence > 0.9 ? 'bg-sage-50 dark:bg-sage-900/10' : ''}`}
                      >
                        <td className="px-4 py-2 font-mono text-sm">
                          {mapping.sourceColumn}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={mapping.targetField || ''}
                            onChange={(e) =>
                              handleMappingChange(
                                mapping.sourceColumn,
                                e.target.value || null
                              )
                            }
                            className="w-full rounded border bg-background px-2 py-1 text-sm"
                          >
                            <option value="">-- Skip this column --</option>
                            {targetFields[dataType].map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.label} {field.required && '*'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          {mapping.confidence > 0 && (
                            <Badge
                              variant={mapping.confidence > 0.9 ? 'default' : 'secondary'}
                              className={mapping.confidence > 0.9 ? 'bg-sage-600' : ''}
                            >
                              {Math.round(mapping.confidence * 100)}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Required fields</AlertTitle>
                <AlertDescription>
                  {targetFields[dataType]
                    .filter((f) => f.required)
                    .map((f) => f.label)
                    .join(', ')}{' '}
                  must be mapped.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-sage-600">{preview.valid}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-gold-600">{preview.duplicates}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-rose-600">{preview.invalid}</div>
                    <div className="text-sm text-muted-foreground">Invalid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{preview.rows.length}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </CardContent>
                </Card>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Data Preview</th>
                      <th className="px-3 py-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          {row.errors.length > 0 ? (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          ) : row.isDuplicate ? (
                            <AlertCircle className="h-4 w-4 text-gold-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-sage-600" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {Object.entries(row.data)
                            .slice(0, 3)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </td>
                        <td className="px-3 py-2 text-xs text-rose-600">
                          {row.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h4 className="text-lg font-medium mb-2">Importing Data...</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Please wait while we import your records
              </p>
              <div className="w-full max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && importResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-sage-600 mb-4" />
              <h4 className="text-xl font-medium mb-2">Import Complete!</h4>

              <div className="grid grid-cols-4 gap-4 w-full max-w-lg mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-sage-600">{importResult.created}</div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cobalt-600">{importResult.updated}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gold-600">{importResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-600">{importResult.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {step === 'platform' && (
              <Button onClick={() => setStep('upload')} disabled={!platform}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'mapping' && (
              <>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={
                    previewMutation.isPending ||
                    !targetFields[dataType]
                      .filter((f) => f.required)
                      .every((f) => mappings.some((m) => m.targetField === f.id))
                  }
                >
                  {previewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Preview Import
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={preview?.valid === 0}>
                  Import {preview?.valid} Records
                </Button>
              </>
            )}
            {step === 'complete' && (
              <Button onClick={() => { setIsOpen(false); resetWizard(); }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// =====================================================
// Main Page Component
// =====================================================

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services and import data from other platforms
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Integrations</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="all">All Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <QuickBooksIntegration />
          <ZapierIntegration />
          <MakeIntegration />
          <N8nIntegration />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <CompetitorImportWizard />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>More integrations coming soon</AlertTitle>
            <AlertDescription>
              We&apos;re working on integrations with Google Calendar, Mailchimp, The Knot,
              WeddingWire, and more. Check back soon!
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
