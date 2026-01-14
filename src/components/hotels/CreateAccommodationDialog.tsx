'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, MapPin, Phone, Mail, Globe, Clock, Save, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface Accommodation {
  id: string
  name: string
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  notes?: string | null
  isDefault?: boolean | null
}

interface CreateAccommodationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSuccess?: () => void
  accommodation?: Accommodation | null // For edit mode
}

export function CreateAccommodationDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
  accommodation,
}: CreateAccommodationDialogProps) {
  const isEditMode = !!accommodation

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    notes: '',
    isDefault: false,
  })

  // Populate form when editing
  useEffect(() => {
    if (accommodation) {
      setFormData({
        name: accommodation.name || '',
        address: accommodation.address || '',
        city: accommodation.city || '',
        phone: accommodation.phone || '',
        email: accommodation.email || '',
        website: accommodation.website || '',
        checkInTime: accommodation.checkInTime || '15:00',
        checkOutTime: accommodation.checkOutTime || '11:00',
        notes: accommodation.notes || '',
        isDefault: accommodation.isDefault || false,
      })
    } else {
      resetForm()
    }
  }, [accommodation, open])

  const utils = trpc.useUtils()

  const createMutation = trpc.accommodations.create.useMutation({
    onSuccess: () => {
      toast.success('Accommodation created successfully')
      utils.accommodations.getAll.invalidate({ clientId })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create accommodation')
    },
  })

  const updateMutation = trpc.accommodations.update.useMutation({
    onSuccess: () => {
      toast.success('Accommodation updated successfully')
      utils.accommodations.getAll.invalidate({ clientId })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update accommodation')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      notes: '',
      isDefault: false,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Hotel name is required')
      return
    }

    const data = {
      name: formData.name.trim(),
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      website: formData.website.trim() || undefined,
      checkInTime: formData.checkInTime || undefined,
      checkOutTime: formData.checkOutTime || undefined,
      notes: formData.notes.trim() || undefined,
      isDefault: formData.isDefault,
    }

    if (isEditMode && accommodation) {
      updateMutation.mutate({
        id: accommodation.id,
        data,
      })
    } else {
      createMutation.mutate({
        clientId,
        ...data,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEditMode ? 'Edit Accommodation' : 'Create Accommodation'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update hotel or accommodation details'
              : 'Add a new hotel or accommodation for guest room allotment'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Hotel Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Hotel Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Grand Hyatt, Marriott"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            <Input
              id="address"
              placeholder="Full address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City name"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          {/* Contact Info - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </Label>
              <Input
                id="phone"
                placeholder="Contact number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="reservations@hotel.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.hotel.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          {/* Check-in/Check-out Times - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Check-in Time
              </Label>
              <Input
                id="checkInTime"
                type="time"
                value={formData.checkInTime}
                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOutTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Check-out Time
              </Label>
              <Input
                id="checkOutTime"
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about the hotel..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked === true })}
            />
            <Label htmlFor="isDefault" className="text-sm text-muted-foreground cursor-pointer">
              Set as default hotel for new room assignments
            </Label>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Accommodation' : 'Create Accommodation'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
