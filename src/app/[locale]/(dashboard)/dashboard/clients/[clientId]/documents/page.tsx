'use client'

import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Edit, File, FileText, Image, Download, Upload, FileSignature } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SignatureTracker } from '@/components/documents/signature-tracker'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { ExportButton } from '@/components/export/export-button'

export default function DocumentsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('documents')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    fileName: '',
    fileType: 'other' as 'contract' | 'invoice' | 'photo' | 'other',
    description: '',
    tags: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: documents, isLoading } = trpc.documents.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.documents.getStats.useQuery({
    clientId: clientId,
  })

  const { data: signatureStats } = trpc.documents.getSignatureStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const requestSignatureMutation = trpc.documents.requestSignature.useMutation({
    onSuccess: async () => {
      toast({ title: t('signatureRequestSent') })
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getSignatureStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const sendReminderMutation = trpc.documents.sendSignatureReminder.useMutation({
    onSuccess: async () => {
      toast({ title: t('reminderSent') })
      await utils.documents.getAll.invalidate({ clientId })
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const cancelSignatureMutation = trpc.documents.cancelSignatureRequest.useMutation({
    onSuccess: async () => {
      toast({ title: t('signatureRequestCancelled') })
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getSignatureStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const signDocumentMutation = trpc.documents.signDocument.useMutation({
    onSuccess: async () => {
      toast({ title: t('documentSigned') })
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getSignatureStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const generateUploadUrlMutation = trpc.documents.generateUploadUrl.useMutation()

  const createMutation = trpc.documents.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('documentUploaded') })
      resetForm()
      setIsAddDialogOpen(false)
      setUploadingFile(null)
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('documentUpdated') })
      setEditingDoc(null)
      resetForm()
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('documentDeleted') })
      await Promise.all([
        utils.documents.getAll.invalidate({ clientId }),
        utils.documents.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      fileName: '',
      fileType: 'other',
      description: '',
      tags: '',
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingFile(file)
      setFormData({ ...formData, fileName: file.name })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingDoc && !uploadingFile) {
      toast({ title: tc('error'), description: t('selectFileToUpload'), variant: 'destructive' })
      return
    }

    if (editingDoc) {
      // Update existing document metadata
      updateMutation.mutate({
        id: editingDoc.id,
        data: {
          fileName: formData.fileName,
          fileType: formData.fileType,
          description: formData.description,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        },
      })
    } else if (uploadingFile) {
      try {
        // Generate upload URL
        const uploadInfo = await generateUploadUrlMutation.mutateAsync({
          clientId: clientId,
          fileName: uploadingFile.name,
          mimeType: uploadingFile.type,
        })

        // Note: In a real implementation, you would upload to Supabase Storage here
        // For now, we'll just create the document record
        // const { data, error } = await supabase.storage
        //   .from(uploadInfo.bucket)
        //   .upload(uploadInfo.storagePath, uploadingFile)

        // Create document record
        createMutation.mutate({
          clientId: clientId,
          fileName: formData.fileName || uploadingFile.name,
          fileType: formData.fileType,
          mimeType: uploadingFile.type,
          fileSize: uploadingFile.size,
          storagePath: uploadInfo.storagePath,
          description: formData.description,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        })
      } catch (error) {
        toast({ title: tc('error'), description: t('uploadFailed'), variant: 'destructive' })
      }
    }
  }

  const handleEdit = (doc: any) => {
    setEditingDoc(doc)
    setFormData({
      fileName: doc.name || '',
      fileType: doc.fileType || 'other',
      description: doc.description || '',
      tags: doc.tags?.join(', ') || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleRequestSignature = (
    documentId: string,
    signerEmail: string,
    signerName: string,
    expiresInDays: number
  ) => {
    requestSignatureMutation.mutate({
      documentId,
      signerEmail,
      signerName,
      expiresInDays,
    })
  }

  const handleSendReminder = (documentId: string) => {
    sendReminderMutation.mutate({ documentId })
  }

  const handleCancelSignatureRequest = (documentId: string) => {
    if (confirm(t('confirmCancelSignature'))) {
      cancelSignatureMutation.mutate({ documentId })
    }
  }

  const handleSignDocument = (
    documentId: string,
    signatureDataUrl: string,
    signedAt: string
  ) => {
    signDocumentMutation.mutate({
      documentId,
      signatureDataUrl,
      signedAt,
    })
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileText className="w-5 h-5 text-cobalt-600 dark:text-cobalt-400" />
      case 'invoice':
        return <FileText className="w-5 h-5 text-sage-600 dark:text-sage-400" />
      case 'photo':
        return <Image className="w-5 h-5 text-teal-600 dark:text-teal-400" />
      default:
        return <File className="w-5 h-5 text-mocha-600 dark:text-mocha-400" />
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
        title={t('documentManagement')}
        description={t('manageDocumentsFiles')}
      >
        <ExportButton
          data={documents || []}
          dataType="documents"
          variant="outline"
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('uploadDocument')}
        </Button>
      </ClientModuleHeader>

      {/* Tabs for Documents and Signatures */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <File className="h-4 w-4" />
            {t('documentsTab')}
          </TabsTrigger>
          <TabsTrigger value="signatures" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            {t('eSignatures')}
            {signatureStats && signatureStats.pending > 0 && (
              <span className="ml-1 bg-gold-100 dark:bg-gold-900 text-gold-800 dark:text-gold-200 text-xs px-2 py-0.5 rounded-full">
                {signatureStats.pending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard
              title={t('totalDocuments')}
              value={stats?.total || 0}
              icon={<File className="w-4 h-4" />}
            />
            <StatCard
              title={t('contracts')}
              value={stats?.contracts || 0}
              icon={<FileText className="w-4 h-4" />}
              color="text-cobalt-600 dark:text-cobalt-400"
            />
            <StatCard
              title={t('invoices')}
              value={stats?.invoices || 0}
              color="text-sage-600 dark:text-sage-400"
            />
            <StatCard
              title={t('photos')}
              value={stats?.photos || 0}
              icon={<Image className="w-4 h-4" />}
              color="text-teal-600 dark:text-teal-400"
            />
            <StatCard
              title={t('storageUsed')}
              value={`${stats?.totalSizeMB || 0} MB`}
              color="text-gold-600 dark:text-gold-400"
            />
          </div>

          {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('allDocuments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {documents?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noDocumentsYet')}
            </div>
          ) : (
            <div className="space-y-2">
              {documents?.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getFileIcon(doc.fileType || '')}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{doc.name}</h3>
                        <span className="text-xs bg-cobalt-100 dark:bg-cobalt-900 text-cobalt-700 dark:text-cobalt-300 px-2 py-1 rounded">
                          {doc.fileType}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {doc.description && <p>{doc.description}</p>}
                        {doc.fileSize && (
                          <p>{t('size')}: {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                        {doc.createdAt && (
                          <p>
                            {t('uploaded')}: {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        )}
                        {doc.metadata && (doc.metadata as any).tags && (doc.metadata as any).tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {((doc.metadata as any).tags as string[]).map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs bg-mocha-100 dark:bg-mocha-900 text-mocha-700 dark:text-mocha-300 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.fileUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <Download className="w-4 h-4" />
                        <span className="sr-only">{tc('download')}</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(doc)}
                      className="h-8 w-8 hover:bg-muted"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="sr-only">{tc('edit')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">{tc('delete')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="signatures" className="mt-6">
          <SignatureTracker
            documents={documents || []}
            stats={signatureStats}
            onRequestSignature={handleRequestSignature}
            onSendReminder={handleSendReminder}
            onCancelRequest={handleCancelSignatureRequest}
            onSignDocument={handleSignDocument}
            isLoading={
              requestSignatureMutation.isPending ||
              sendReminderMutation.isPending ||
              cancelSignatureMutation.isPending ||
              signDocumentMutation.isPending
            }
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingDoc}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingDoc(null)
            setUploadingFile(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? t('editDocument') : t('uploadDocument')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingDoc && (
              <div>
                <Label htmlFor="file">{t('selectFile')} *</Label>
                <div className="mt-2">
                  <label
                    htmlFor="file"
                    className="flex items-center justify-center w-full h-32 px-4 transition bg-white dark:bg-mocha-950 border-2 border-mocha-300 dark:border-mocha-700 border-dashed rounded-md appearance-none cursor-pointer hover:border-mocha-400 dark:hover:border-mocha-600 focus:outline-none"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-mocha-400 dark:text-mocha-500" />
                      <span className="text-sm text-mocha-600 dark:text-mocha-400">
                        {uploadingFile
                          ? uploadingFile.name
                          : t('clickToUpload')}
                      </span>
                    </div>
                    <Input
                      id="file"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fileName">{t('fileName')}</Label>
                <Input
                  id="fileName"
                  value={formData.fileName}
                  onChange={(e) =>
                    setFormData({ ...formData, fileName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fileType">{t('fileType')}</Label>
                <Select
                  value={formData.fileType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, fileType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{t('contract')}</SelectItem>
                    <SelectItem value="invoice">{t('invoice')}</SelectItem>
                    <SelectItem value="photo">{t('photo')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">{tc('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tags">{t('tagsLabel')}</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder={t('tagsPlaceholder')}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingDoc(null)
                  setUploadingFile(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  generateUploadUrlMutation.isPending
                }
              >
                {editingDoc ? tc('update') : t('upload')}
              </Button>
            </DialogFooter>
          </form>
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
