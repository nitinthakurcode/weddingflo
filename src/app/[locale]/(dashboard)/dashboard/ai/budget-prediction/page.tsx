'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  CalendarIcon,
  Sparkles,
  TrendingUp,
  DollarSign,
  Lightbulb,
  MapPin,
  Users,
  Building2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const budgetFormSchema = z.object({
  guestCount: z.number().int().min(1, 'Must be at least 1 guest').max(1000, 'Maximum 1000 guests'),
  venueType: z.enum(['hotel', 'outdoor', 'banquet_hall', 'restaurant', 'destination', 'other']),
  location: z.string().min(2, 'Location is required'),
  weddingDate: z.date().optional(),
  eventStyle: z.enum(['casual', 'formal', 'luxury', 'traditional', 'modern']),
  additionalContext: z.string().max(500).optional(),
})

type BudgetFormData = z.infer<typeof budgetFormSchema>

const VENUE_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'outdoor', label: 'Outdoor Venue' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'destination', label: 'Destination Wedding' },
  { value: 'other', label: 'Other' },
]

const EVENT_STYLES = [
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'modern', label: 'Modern' },
]

export default function BudgetPredictionPage() {
  const [prediction, setPrediction] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Get AI usage
  const { data: usage } = trpc.ai.getUsage.useQuery()

  // Generate budget prediction mutation
  const generateBudget = trpc.ai.generateBudgetPrediction.useMutation({
    onSuccess: (data) => {
      setPrediction(data)
      setIsGenerating(false)
    },
    onError: (error) => {
      setIsGenerating(false)
      console.error('Budget prediction error:', error)
    },
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      guestCount: 100,
      venueType: 'hotel',
      location: '',
      eventStyle: 'formal',
    },
  })

  const weddingDate = watch('weddingDate')

  const onSubmit = async (data: BudgetFormData) => {
    setIsGenerating(true)
    setPrediction(null)

    try {
      await generateBudget.mutateAsync({
        guestCount: data.guestCount,
        venueType: data.venueType,
        location: data.location,
        weddingDate: data.weddingDate?.toISOString(),
        eventStyle: data.eventStyle,
        additionalContext: data.additionalContext,
      })
    } catch (error) {
      // Error handled in onError callback
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Budget Prediction
            </h1>
            <p className="text-muted-foreground mt-2">
              Get intelligent budget estimates powered by AI
            </p>
          </div>

          {/* AI Usage Badge */}
          {usage && (
            <Card className="w-64">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Queries</span>
                    <span className="font-medium">
                      {usage.used} / {usage.limit}
                    </span>
                  </div>
                  <Progress value={usage.percentageUsed} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {usage.remaining} queries remaining this month
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quota Warning */}
      {usage && usage.remaining === 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve reached your AI query limit for this month. Upgrade your subscription to continue using AI features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Wedding Details</CardTitle>
              <CardDescription>
                Provide information about the wedding to get accurate predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Guest Count */}
                <div className="space-y-2">
                  <Label htmlFor="guestCount" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Guest Count
                  </Label>
                  <Input
                    id="guestCount"
                    type="number"
                    placeholder="100"
                    {...register('guestCount', { valueAsNumber: true })}
                  />
                  {errors.guestCount && (
                    <p className="text-sm text-destructive">{errors.guestCount.message}</p>
                  )}
                </div>

                {/* Venue Type */}
                <div className="space-y-2">
                  <Label htmlFor="venueType" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Venue Type
                  </Label>
                  <Controller
                    name="venueType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="venueType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VENUE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="New York, NY"
                    {...register('location')}
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location.message}</p>
                  )}
                </div>

                {/* Wedding Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Wedding Date (Optional)
                  </Label>
                  <Controller
                    name="weddingDate"
                    control={control}
                    render={({ field }) => (
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
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                {/* Event Style */}
                <div className="space-y-2">
                  <Label htmlFor="eventStyle">Event Style</Label>
                  <Controller
                    name="eventStyle"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="eventStyle">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_STYLES.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Additional Context */}
                <div className="space-y-2">
                  <Label htmlFor="additionalContext">
                    Additional Context (Optional)
                  </Label>
                  <Textarea
                    id="additionalContext"
                    placeholder="Any specific requirements or preferences..."
                    rows={3}
                    {...register('additionalContext')}
                  />
                  {errors.additionalContext && (
                    <p className="text-sm text-destructive">{errors.additionalContext.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isGenerating || (usage && usage.remaining === 0)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Prediction...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Budget Prediction
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div>
          {isGenerating && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing wedding details...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is generating your personalized budget prediction
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isGenerating && !prediction && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No prediction yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Fill in the wedding details and click &quot;Generate Budget Prediction&quot; to get AI-powered insights
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {prediction && !isGenerating && (
            <div className="space-y-6">
              {/* Total Budget */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Estimated Total Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(prediction.totalBudget, prediction.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {prediction.categories.length} expense categories
                  </p>
                </CardContent>
              </Card>

              {/* Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {prediction.categories.map((category: any, index: number) => (
                    <div key={index} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{category.category}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.reasoning}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {formatCurrency(category.suggestedAmount, prediction.currency)}
                        </Badge>
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Min: {formatCurrency(category.minAmount, prediction.currency)}</span>
                        <span>•</span>
                        <span>Max: {formatCurrency(category.maxAmount, prediction.currency)}</span>
                      </div>

                      {category.tips && category.tips.length > 0 && (
                        <div className="space-y-1">
                          {category.tips.map((tip: string, tipIndex: number) => (
                            <p key={tipIndex} className="text-sm flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                              <span>{tip}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {index < prediction.categories.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Savings Tips */}
              {prediction.savingsTips && prediction.savingsTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Money-Saving Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {prediction.savingsTips.map((tip: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Seasonal & Location Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prediction.seasonalConsiderations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Seasonal Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{prediction.seasonalConsiderations}</p>
                    </CardContent>
                  </Card>
                )}

                {prediction.locationInsights && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Location Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{prediction.locationInsights}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
