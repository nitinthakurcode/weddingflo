'use client'

import { useState } from 'react'
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
  module: 'guests' | 'vendors' | 'budget' | 'gifts'
  clientId: string
  onImportComplete?: () => void
}

export function ImportDialog({ module, clientId, onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<any>(null)

  const downloadTemplate = trpc.import.downloadTemplate.useMutation()
  const importData = trpc.import.importData.useMutation()

  const moduleNames = {
    guests: 'Guest List',
    vendors: 'Vendors',
    budget: 'Budget',
    gifts: 'Gifts',
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
          Import {moduleNames[module]}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {moduleNames[module]}</DialogTitle>
          <DialogDescription>
            Download your template, edit it with your data, then upload to update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 1: Download Template</h3>
            <Button
              onClick={handleDownloadTemplate}
              disabled={downloadTemplate.isPending}
              variant="secondary"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadTemplate.isPending ? 'Generating...' : 'Download Excel Template'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Template includes your existing data. Edit rows, add new rows (leave ID blank), then upload.
            </p>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 2: Upload Edited File</h3>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Excel (.xlsx, .xls) or CSV files only
                </p>
              </label>
            </div>
            {file && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
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
              {importData.isPending ? 'Importing...' : 'Import Data'}
            </Button>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <Alert variant={results.errors.length > 0 ? 'destructive' : 'default'}>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Import Complete</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✅ {results.created} new rows created</li>
                    <li>✏️ {results.updated} existing rows updated</li>
                    {results.errors.length > 0 && (
                      <li className="text-red-600">❌ {results.errors.length} errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-semibold text-red-800 mb-2 text-sm">Errors:</h4>
                  <ul className="text-xs text-red-700 space-y-1">
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
                  Import Another File
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
