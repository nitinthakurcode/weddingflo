'use client'

import { useState } from 'react'
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
import { Plus, Trash2, Edit, File, FileText, Image, Download, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DocumentsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
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

  // Mutations
  const generateUploadUrlMutation = trpc.documents.generateUploadUrl.useMutation()

  const createMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Document uploaded successfully' })
      utils.documents.getAll.invalidate()
      utils.documents.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
      setUploadingFile(null)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Document updated successfully' })
      utils.documents.getAll.invalidate()
      utils.documents.getStats.invalidate()
      setEditingDoc(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Document deleted successfully' })
      utils.documents.getAll.invalidate()
      utils.documents.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
      toast({ title: 'Error', description: 'Please select a file to upload', variant: 'destructive' })
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
        toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' })
      }
    }
  }

  const handleEdit = (doc: any) => {
    setEditingDoc(doc)
    setFormData({
      fileName: doc.name || '',
      fileType: doc.file_type || 'other',
      description: doc.description || '',
      tags: doc.tags?.join(', ') || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate({ id })
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileText className="w-5 h-5 text-blue-600" />
      case 'invoice':
        return <FileText className="w-5 h-5 text-green-600" />
      case 'photo':
        return <Image className="w-5 h-5 text-purple-600" />
      default:
        return <File className="w-5 h-5 text-gray-600" />
    }
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p>No client selected</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage wedding documents and files</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Documents"
          value={stats?.total || 0}
          icon={<File className="w-4 h-4" />}
        />
        <StatCard
          title="Contracts"
          value={stats?.contracts || 0}
          icon={<FileText className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Invoices"
          value={stats?.invoices || 0}
          color="text-green-600"
        />
        <StatCard
          title="Photos"
          value={stats?.photos || 0}
          icon={<Image className="w-4 h-4" />}
          color="text-purple-600"
        />
        <StatCard
          title="Storage Used"
          value={`${stats?.totalSizeMB || 0} MB`}
          color="text-orange-600"
        />
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents yet. Upload your first document to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {documents?.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getFileIcon(doc.file_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{doc.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {doc.file_type}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {doc.description && <p>{doc.description}</p>}
                        {doc.file_size && (
                          <p>Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                        {doc.created_at && (
                          <p>
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        )}
                        {doc.metadata && (doc.metadata as any).tags && (doc.metadata as any).tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {((doc.metadata as any).tags as string[]).map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              {editingDoc ? 'Edit Document' : 'Upload Document'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingDoc && (
              <div>
                <Label htmlFor="file">Select File *</Label>
                <div className="mt-2">
                  <label
                    htmlFor="file"
                    className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {uploadingFile
                          ? uploadingFile.name
                          : 'Click to upload or drag and drop'}
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
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  value={formData.fileName}
                  onChange={(e) =>
                    setFormData({ ...formData, fileName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fileType">File Type</Label>
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
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
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
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="e.g., important, venue, contract"
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  generateUploadUrlMutation.isPending
                }
              >
                {editingDoc ? 'Update' : 'Upload'}
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
