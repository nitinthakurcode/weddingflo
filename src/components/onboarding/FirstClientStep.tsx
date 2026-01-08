'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const clientSchema = z.object({
  partner1_name: z.string().min(2, 'Name must be at least 2 characters'),
  partner2_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  wedding_date: z.date(),
  vendors: z.string().optional(), // Comma-separated vendor names with optional category
})

type ClientFormData = z.input<typeof clientSchema>

interface FirstClientStepProps {
  onNext: (data: ClientFormData | null) => void
  onBack: () => void
  initialData?: Partial<ClientFormData>
}

export function FirstClientStep({ onNext, onBack, initialData }: FirstClientStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData,
  })

  const weddingDate = watch('wedding_date')

  const onSubmit = async (data: ClientFormData) => {
    onNext(data)
  }

  const handleSkip = () => {
    onNext(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Your First Client (Optional)</CardTitle>
          <CardDescription>
            Get started by adding your first wedding couple, or skip this step for now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner1_name">Partner 1 Name *</Label>
                <Input
                  id="partner1_name"
                  placeholder="Sarah"
                  {...register('partner1_name')}
                />
                {errors.partner1_name && (
                  <p className="text-sm text-destructive">{errors.partner1_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner2_name">Partner 2 Name *</Label>
                <Input
                  id="partner2_name"
                  placeholder="John"
                  {...register('partner2_name')}
                />
                {errors.partner2_name && (
                  <p className="text-sm text-destructive">{errors.partner2_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="sarah.and.john@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label>Wedding Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !weddingDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {weddingDate ? format(weddingDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={weddingDate}
                    onSelect={(date) => setValue('wedding_date', date as Date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.wedding_date && (
                <p className="text-sm text-destructive">{errors.wedding_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendors">Vendors (Optional)</Label>
              <Input
                id="vendors"
                placeholder="e.g., Venue: Grand Hotel, Catering: Tasty Foods, Photography: Picture Perfect"
                {...register('vendors')}
              />
              <p className="text-xs text-muted-foreground">
                Enter vendors separated by commas. Format: "Category: Vendor Name" or just "Vendor Name"
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                ← Back
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip for Now
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Client →'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
