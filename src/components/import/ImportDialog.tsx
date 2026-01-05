'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { Upload, Download, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImportDialogProps {
  module: 'guests' | 'vendors' | 'budget' | 'gifts' | 'hotels' | 'transport' | 'guestGifts'
  clientId: string
  onImportComplete?: () => void
}

export function ImportDialog({ module, clientId, onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('bulkImport')
  const tn = useTranslations('navigation')
  const tc = useTranslations('common')

  const downloadTemplate = trpc.import.downloadTemplate.useMutation()
  const importData = trpc.import.importData.useMutation()

  const moduleNames: Record<string, string> = {
    guests: tn('guests'),
    vendors: tn('vendors'),
    budget: tn('budget'),
    gifts: tn('giftsReceived'),
    hotels: tn('hotels'),
    transport: tn('transport'),
    guestGifts: tn('giftsGiven'),
  }

  const handleDownloadTemplate = async () => {
    try {
      const result = await downloadTemplate.mutateAsync({ module, clientId })

      // Create download link
      const blob = new Blob(
        [Buffer.from(result.data, 'base64')],
        { type: result.mimeType }
      )
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Download failed:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]

    if (validTypes.includes(selectedFile.type) ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls') ||
        selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setResults(null)
    } else {
      alert('Please select a valid Excel (.xlsx, .xls) or CSV file')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleImport = async () => {
    if (!file) return

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const fileData = base64.split(',')[1] // Remove data:... prefix

        const result = await importData.mutateAsync({
          module,
          clientId,
          fileData,
        })

        setResults(result)

        // Call callback if provided
        if (onImportComplete && result.errors.length === 0) {
          onImportComplete()
        }
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      setResults({
        updated: 0,
        created: 0,
        errors: [`Import failed: ${error.message}`]
      })
    }
  }

  const handleClose = () => {
    setFile(null)
    setResults(null)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          {tc('import')} {moduleNames[module]}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tc('import')} {moduleNames[module]}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t('step1')}</h3>
            <Button
              onClick={handleDownloadTemplate}
              disabled={downloadTemplate.isPending}
              variant="secondary"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadTemplate.isPending ? t('generating') : t('downloadTemplate')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('templateDescription')}
            </p>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t('step2')}</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="sr-only"
              tabIndex={-1}
            />
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {t('dropzone')}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {t('fileTypes')}
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="default"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </Button>
            </div>
            {file && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  {t('fileLoaded')}: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Step 3: Import */}
          {file && !results && (
            <Button
              onClick={handleImport}
              disabled={importData.isPending}
              className="w-full"
              size="lg"
            >
              {importData.isPending ? t('importing') : t('importData')}
            </Button>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <Alert variant={results.errors.length > 0 ? 'destructive' : 'default'}>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>{t('importComplete')}</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✅ {results.created} {t('rowsCreated')}</li>
                    <li>✏️ {results.updated} {t('rowsUpdated')}</li>
                    {results.errors.length > 0 && (
                      <li className="text-rose-600 dark:text-rose-400">❌ {results.errors.length} {t('errorsLabel')}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              {results.errors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-md p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-2 text-sm">{t('errorsLabel')}:</h4>
                  <ul className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    {results.errors.map((error: string, i: number) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setFile(null)
                    setResults(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {t('importAnother')}
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  {tc('close')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
