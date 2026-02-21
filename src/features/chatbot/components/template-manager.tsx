'use client'

/**
 * Template Manager Component
 *
 * February 2026 - AI Command Chatbot Feature (Phase 6)
 *
 * User-customizable command templates:
 * - List, create, edit, delete templates
 * - Pin favorites
 * - Usage tracking
 * - Suggested templates from patterns
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Edit2,
  Lightbulb,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface TemplateManagerProps {
  onSelectTemplate: (command: string) => void
  onClose: () => void
}

type TemplateCategory = 'custom' | 'guests' | 'budget' | 'events' | 'vendors' | 'timeline' | 'workflow'

const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  custom: '⚡',
  guests: '👥',
  budget: '💰',
  events: '📅',
  vendors: '🏪',
  timeline: '⏱️',
  workflow: '🔄',
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  custom: 'Custom',
  guests: 'Guests',
  budget: 'Budget',
  events: 'Events',
  vendors: 'Vendors',
  timeline: 'Timeline',
  workflow: 'Workflow',
}

// ============================================
// COMPONENT
// ============================================

export function TemplateManager({ onSelectTemplate, onClose }: TemplateManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')

  // Form state
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')

  // Queries
  const { data: templatesData, refetch: refetchTemplates } = trpc.chatbot.listTemplates.useQuery({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    limit: 50,
  })

  const { data: suggestions } = trpc.chatbot.getSuggestedTemplates.useQuery()

  // Mutations
  const saveTemplate = trpc.chatbot.saveTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates()
      resetForm()
      setShowCreateDialog(false)
    },
  })

  const updateTemplate = trpc.chatbot.updateTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates()
      resetForm()
      setEditingTemplate(null)
    },
  })

  const deleteTemplateMutation = trpc.chatbot.deleteTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates()
      setDeleteConfirm(null)
    },
  })

  const useTemplateMutation = trpc.chatbot.useTemplate.useMutation()

  const togglePin = trpc.chatbot.toggleTemplatePin.useMutation({
    onSuccess: () => {
      refetchTemplates()
    },
  })

  const templates = templatesData?.templates || []

  const resetForm = () => {
    setName('')
    setCommand('')
    setDescription('')
    setCategory('custom')
  }

  const handleCreateTemplate = () => {
    if (!name.trim() || !command.trim()) return

    saveTemplate.mutate({
      name: name.trim(),
      command: command.trim(),
      description: description.trim() || undefined,
      category,
    })
  }

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !name.trim() || !command.trim()) return

    updateTemplate.mutate({
      templateId: editingTemplate,
      name: name.trim(),
      command: command.trim(),
      description: description.trim() || undefined,
      category,
    })
  }

  const handleEditTemplate = (template: typeof templates[0]) => {
    setName(template.name)
    setCommand(template.command)
    setDescription(template.description || '')
    setCategory(template.category as TemplateCategory || 'custom')
    setEditingTemplate(template.id)
  }

  const handleUseTemplate = async (template: typeof templates[0]) => {
    // Track usage
    useTemplateMutation.mutate({ templateId: template.id })
    // Send command to chat
    onSelectTemplate(template.command)
    onClose()
  }

  const handleSaveFromSuggestion = (commandText: string) => {
    setCommand(commandText)
    setName(commandText.slice(0, 30))
    setShowCreateDialog(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-mocha-200 dark:border-mocha-700">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">
            Quick Commands
          </h2>
          <p className="text-xs text-mocha-500">
            {templates.length} saved template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 p-3 border-b border-mocha-200 dark:border-mocha-700 overflow-x-auto">
        <Badge
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer shrink-0"
          onClick={() => setCategoryFilter('all')}
        >
          All
        </Badge>
        {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((cat) => (
          <Badge
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            className="cursor-pointer shrink-0"
            onClick={() => setCategoryFilter(cat)}
          >
            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
          </Badge>
        ))}
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-8 w-8 mx-auto text-mocha-300 mb-2" />
            <p className="text-sm text-mocha-500">No templates yet</p>
            <p className="text-xs text-mocha-400 mt-1">
              Create templates for frequently used commands
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                'group flex items-center gap-2 p-2 rounded-lg hover:bg-mocha-100 dark:hover:bg-mocha-800 transition-colors cursor-pointer',
                template.isPinned && 'bg-teal-50 dark:bg-teal-900/20'
              )}
              onClick={() => handleUseTemplate(template)}
            >
              {/* Icon/Pin indicator */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-mocha-100 dark:bg-mocha-700 flex items-center justify-center">
                {template.isPinned ? (
                  <BookmarkCheck className="h-4 w-4 text-teal-600" />
                ) : (
                  <span className="text-sm">
                    {CATEGORY_ICONS[template.category as TemplateCategory] || '⚡'}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-mocha-900 dark:text-mocha-100 truncate">
                    {template.name}
                  </span>
                  {template.usageCount && template.usageCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {template.usageCount}×
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-mocha-500 truncate">
                  {template.command}
                </p>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePin.mutate({ templateId: template.id })
                    }}
                  >
                    {template.isPinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin to top
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditTemplate(template)
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(template.id)
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}

        {/* Suggestions Section */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-mocha-200 dark:border-mocha-700">
            <div className="flex items-center gap-2 px-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-mocha-600 dark:text-mocha-400">
                Suggested Templates
              </span>
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-mocha-100 dark:hover:bg-mocha-800 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="flex-1 text-sm text-mocha-700 dark:text-mocha-300 truncate">
                    {suggestion.command}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {suggestion.frequency}× used
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSaveFromSuggestion(suggestion.command)}
                  >
                    <Bookmark className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setEditingTemplate(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update your quick command template'
                : 'Save a command for quick access'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Check weekly stats"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Command</label>
              <Input
                placeholder="e.g., Show me confirmed guests for sangeet"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-mocha-500">
                This will be sent to the AI when you use this template
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Brief description of what this does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as TemplateCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingTemplate(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              disabled={
                !name.trim() ||
                !command.trim() ||
                saveTemplate.isPending ||
                updateTemplate.isPending
              }
            >
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) {
                  deleteTemplateMutation.mutate({ templateId: deleteConfirm })
                }
              }}
              disabled={deleteTemplateMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TemplateManager
