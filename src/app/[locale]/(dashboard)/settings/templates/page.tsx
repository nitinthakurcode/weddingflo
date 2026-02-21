'use client'

import { useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Star,
  Flag,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Phase icons and colors
const phaseConfig = {
  setup: { label: 'Setup', icon: Settings, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  showtime: { label: 'Showtime', icon: Star, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  wrapup: { label: 'Wrap Up', icon: Flag, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
}

// Format offset minutes to readable time
function formatOffset(minutes: number): string {
  const absMinutes = Math.abs(minutes)
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  const sign = minutes < 0 ? '-' : '+'
  if (hours === 0) return `${sign}${mins}m`
  if (mins === 0) return `${sign}${hours}h`
  return `${sign}${hours}h ${mins}m`
}

interface TemplateItem {
  id: string
  title: string
  description: string | null
  offsetMinutes: number
  durationMinutes: number
  location: string | null
  phase: string | null
  sortOrder: number | null
  isActive: boolean | null
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const [selectedEventType, setSelectedEventType] = useState<string>('wedding')
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['setup', 'showtime', 'wrapup']))
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    offsetMinutes: 0,
    durationMinutes: 30,
    location: '',
    phase: 'showtime' as 'setup' | 'showtime' | 'wrapup',
  })

  // Queries
  const { data: eventTypes } = trpc.timelineTemplates.getEventTypes.useQuery()
  const { data: templateData, isLoading } = trpc.timelineTemplates.getByEventType.useQuery(
    { eventType: selectedEventType },
    { enabled: !!selectedEventType }
  )

  // Mutations
  const initializeMutation = trpc.timelineTemplates.initializeFromDefaults.useMutation({
    onSuccess: () => {
      utils.timelineTemplates.getByEventType.invalidate({ eventType: selectedEventType })
      toast({ title: 'Templates initialized', description: 'You can now customize the templates.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateItemMutation = trpc.timelineTemplates.updateItem.useMutation({
    onSuccess: () => {
      utils.timelineTemplates.getByEventType.invalidate({ eventType: selectedEventType })
      setEditingItem(null)
      toast({ title: 'Template updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const addItemMutation = trpc.timelineTemplates.addItem.useMutation({
    onSuccess: () => {
      utils.timelineTemplates.getByEventType.invalidate({ eventType: selectedEventType })
      setIsAddDialogOpen(false)
      setNewItem({
        title: '',
        description: '',
        offsetMinutes: 0,
        durationMinutes: 30,
        location: '',
        phase: 'showtime',
      })
      toast({ title: 'Item added' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteItemMutation = trpc.timelineTemplates.deleteItem.useMutation({
    onSuccess: () => {
      utils.timelineTemplates.getByEventType.invalidate({ eventType: selectedEventType })
      toast({ title: 'Item deleted' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetMutation = trpc.timelineTemplates.resetToDefaults.useMutation({
    onSuccess: () => {
      utils.timelineTemplates.getByEventType.invalidate({ eventType: selectedEventType })
      setIsResetDialogOpen(false)
      toast({ title: 'Reset complete', description: 'Templates have been reset to defaults.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  // Group items by phase
  const groupedItems = templateData?.items.reduce(
    (acc, item) => {
      const phase = (item.phase || 'showtime') as keyof typeof acc
      if (!acc[phase]) acc[phase] = []
      acc[phase].push(item as TemplateItem)
      return acc
    },
    { setup: [] as TemplateItem[], showtime: [] as TemplateItem[], wrapup: [] as TemplateItem[] }
  )

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  const handleInitialize = () => {
    initializeMutation.mutate({ eventType: selectedEventType })
  }

  const handleUpdateItem = () => {
    if (!editingItem) return
    updateItemMutation.mutate({
      id: editingItem.id,
      title: editingItem.title,
      description: editingItem.description || undefined,
      offsetMinutes: editingItem.offsetMinutes,
      durationMinutes: editingItem.durationMinutes,
      location: editingItem.location,
      phase: (editingItem.phase || 'showtime') as 'setup' | 'showtime' | 'wrapup',
      isActive: editingItem.isActive ?? true,
    })
  }

  const handleAddItem = () => {
    addItemMutation.mutate({
      eventType: selectedEventType,
      ...newItem,
    })
  }

  const handleDeleteItem = (id: string) => {
    deleteItemMutation.mutate({ id })
  }

  const handleReset = () => {
    resetMutation.mutate({ eventType: selectedEventType })
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Timeline Templates</h1>
          <p className="text-muted-foreground">
            Customize default timeline items for each event type
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Event Type Templates</CardTitle>
              <CardDescription>
                Select an event type to view and customize its timeline template.
                Changes will apply to all future events of this type.
              </CardDescription>
            </div>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes?.types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {eventTypes.displayNames[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !templateData?.isCustomized ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">
                Using default templates for {templateData?.displayName}.
              </p>
              <p className="text-sm text-muted-foreground">
                Initialize custom templates to start editing item names and timings.
              </p>
              <Button onClick={handleInitialize} disabled={initializeMutation.isPending}>
                {initializeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Initialize Custom Templates
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-green-600">
                  Customized
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsResetDialogOpen(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>

              {/* Phase-grouped template items */}
              {(['setup', 'showtime', 'wrapup'] as const).map((phase) => {
                const config = phaseConfig[phase]
                const items = groupedItems?.[phase] || []
                const Icon = config.icon

                return (
                  <Collapsible
                    key={phase}
                    open={expandedPhases.has(phase)}
                    onOpenChange={() => togglePhase(phase)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{config.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {items.length} items
                        </Badge>
                      </div>
                      {expandedPhases.has(phase) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          No items in this phase
                        </p>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              item.isActive === false ? 'opacity-50 bg-muted' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{item.title}</span>
                                <Badge variant="outline" className={`${config.bgColor} ${config.textColor} text-xs`}>
                                  {formatOffset(item.offsetMinutes)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {item.durationMinutes}m
                                </Badge>
                                {item.isActive === false && (
                                  <Badge variant="secondary" className="text-xs">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template Item</DialogTitle>
            <DialogDescription>
              Modify the template item details. Changes apply to future events.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Offset (minutes from event start)</Label>
                  <Input
                    type="number"
                    value={editingItem.offsetMinutes}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, offsetMinutes: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Negative = before event start
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.durationMinutes}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, durationMinutes: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location (optional)</Label>
                <Input
                  value={editingItem.location || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                  placeholder="e.g., Bridal Suite, Main Hall"
                />
              </div>
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select
                  value={editingItem.phase || 'showtime'}
                  onValueChange={(v) => setEditingItem({ ...editingItem, phase: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setup">Setup</SelectItem>
                    <SelectItem value="showtime">Showtime</SelectItem>
                    <SelectItem value="wrapup">Wrap Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editingItem.isActive ?? true}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, isActive: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItemMutation.isPending}>
              {updateItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Template Item</DialogTitle>
            <DialogDescription>
              Add a new item to the {templateData?.displayName} template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="e.g., Photography Session"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Brief description of this activity"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Offset (minutes)</Label>
                <Input
                  type="number"
                  value={newItem.offsetMinutes}
                  onChange={(e) => setNewItem({ ...newItem, offsetMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.durationMinutes}
                  onChange={(e) => setNewItem({ ...newItem, durationMinutes: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                placeholder="e.g., Garden Area"
              />
            </div>
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select
                value={newItem.phase}
                onValueChange={(v) => setNewItem({ ...newItem, phase: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="showtime">Showtime</SelectItem>
                  <SelectItem value="wrapup">Wrap Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!newItem.title || addItemMutation.isPending}>
              {addItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all custom template items for {templateData?.displayName} and
              revert to the default templates. You will need to re-initialize to customize again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
              {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
