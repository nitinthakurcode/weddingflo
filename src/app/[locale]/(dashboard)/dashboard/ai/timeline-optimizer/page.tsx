'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Clock,
  Sparkles,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  MapPin,
  Users,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const timelineEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration: z.number().int().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  participants: z.array(z.string()).optional(),
  vendor: z.string().optional(),
  isFixed: z.boolean().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
})

const timelineFormSchema = z.object({
  weddingDate: z.string().min(1, 'Wedding date is required'),
  ceremonyTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  receptionTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  venueAddress: z.string().optional(),
  numberOfGuests: z.number().int().min(1).optional(),
  additionalContext: z.string().optional(),
  events: z.array(timelineEventSchema).min(1, 'At least one event is required'),
})

type TimelineFormData = z.infer<typeof timelineFormSchema>

export default function TimelineOptimizerPage() {
  const [optimization, setOptimization] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const { toast } = useToast()

  // Get AI usage
  const { data: usage } = trpc.ai.getUsage.useQuery()

  // Optimize timeline mutation
  const optimizeTimeline = trpc.ai.optimizeTimeline.useMutation({
    onSuccess: (data) => {
      setOptimization(data.data)
      setIsOptimizing(false)
      toast({
        title: 'Timeline optimized!',
        description: 'AI has analyzed your wedding timeline.',
      })
    },
    onError: (error) => {
      setIsOptimizing(false)
      toast({
        title: 'Optimization failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TimelineFormData>({
    resolver: zodResolver(timelineFormSchema),
    defaultValues: {
      weddingDate: format(new Date(), 'yyyy-MM-dd'),
      events: [
        {
          title: 'Ceremony',
          startTime: '14:00',
          endTime: '14:30',
          duration: 30,
          location: 'Main Chapel',
          isFixed: true,
          priority: 'high',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  })

  const onSubmit = async (data: TimelineFormData) => {
    setIsOptimizing(true)
    setOptimization(null)

    try {
      await optimizeTimeline.mutateAsync({
        ...data,
        numberOfGuests: data.numberOfGuests || undefined,
      })
    } catch (error) {
      // Error handled in onError callback
    }
  }

  const addEvent = () => {
    append({
      title: '',
      startTime: '15:00',
      endTime: '16:00',
      duration: 60,
      location: '',
      priority: 'medium',
    })
  }

  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    return endMinutes - startMinutes
  }

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-gold-500 dark:text-gold-400" />
      case 'info':
        return <Info className="h-5 w-5 text-cobalt-500 dark:text-cobalt-400" />
    }
  }

  const getSeverityVariant = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              AI Timeline Optimizer
            </h1>
            <p className="text-muted-foreground mt-2">
              Optimize your wedding day schedule with AI
            </p>
          </div>

          {/* AI Usage Badge */}
          {usage && (
            <Badge variant={usage.remaining === 0 ? 'destructive' : 'secondary'}>
              {usage.remaining} / {usage.limit} queries remaining
            </Badge>
          )}
        </div>
      </div>

      {/* Quota Warning */}
      {usage && usage.remaining === 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve reached your AI query limit for this month. Upgrade your subscription to continue.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline Details</CardTitle>
              <CardDescription>
                Add your wedding day events for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Wedding Date */}
                <div className="space-y-2">
                  <Label htmlFor="weddingDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Wedding Date
                  </Label>
                  <Input
                    id="weddingDate"
                    type="date"
                    {...register('weddingDate')}
                  />
                  {errors.weddingDate && (
                    <p className="text-sm text-destructive">{errors.weddingDate.message}</p>
                  )}
                </div>

                {/* Ceremony Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ceremonyTime">Ceremony Time</Label>
                    <Input
                      id="ceremonyTime"
                      type="time"
                      {...register('ceremonyTime')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receptionTime">Reception Time</Label>
                    <Input
                      id="receptionTime"
                      type="time"
                      {...register('receptionTime')}
                    />
                  </div>
                </div>

                {/* Venue Address */}
                <div className="space-y-2">
                  <Label htmlFor="venueAddress" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Venue Address
                  </Label>
                  <Input
                    id="venueAddress"
                    placeholder="123 Main St, City"
                    {...register('venueAddress')}
                  />
                </div>

                {/* Number of Guests */}
                <div className="space-y-2">
                  <Label htmlFor="numberOfGuests" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Guests
                  </Label>
                  <Input
                    id="numberOfGuests"
                    type="number"
                    placeholder="100"
                    {...register('numberOfGuests', { valueAsNumber: true })}
                  />
                </div>

                {/* Additional Context */}
                <div className="space-y-2">
                  <Label htmlFor="additionalContext">Additional Context</Label>
                  <Textarea
                    id="additionalContext"
                    placeholder="Any special considerations..."
                    rows={2}
                    {...register('additionalContext')}
                  />
                </div>

                <Separator />

                {/* Events */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Timeline Events</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEvent}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Event
                    </Button>
                  </div>

                  {errors.events?.message && (
                    <Alert variant="destructive">
                      <AlertDescription>{errors.events.message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {fields.map((field, index) => (
                      <Card key={field.id}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Event {index + 1}</span>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Input
                              placeholder="Event title"
                              {...register(`events.${index}.title`)}
                            />
                            {errors.events?.[index]?.title && (
                              <p className="text-xs text-destructive">
                                {errors.events[index]?.title?.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Start Time</Label>
                              <Input
                                type="time"
                                {...register(`events.${index}.startTime`, {
                                  onChange: (e) => {
                                    const start = e.target.value
                                    const end = document.querySelector<HTMLInputElement>(
                                      `input[name="events.${index}.endTime"]`
                                    )?.value
                                    if (start && end) {
                                      const duration = calculateDuration(start, end)
                                      // Update duration field
                                    }
                                  },
                                })}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">End Time</Label>
                              <Input
                                type="time"
                                {...register(`events.${index}.endTime`)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Duration (min)</Label>
                              <Input
                                type="number"
                                {...register(`events.${index}.duration`, { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Priority</Label>
                              <Controller
                                name={`events.${index}.priority`}
                                control={control}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>

                          <Input
                            placeholder="Location (optional)"
                            {...register(`events.${index}.location`)}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isOptimizing || (usage && usage.remaining === 0)}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing Timeline...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize Timeline
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {isOptimizing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing timeline...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is detecting conflicts and optimizing your schedule
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isOptimizing && !optimization && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No optimization yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Add your wedding day events and click &quot;Optimize Timeline&quot; to get AI-powered insights
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {optimization && !isOptimizing && (
            <div className="space-y-6">
              {/* Overall Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {optimization.conflictDetected ? (
                      <AlertTriangle className="h-5 w-5 text-gold-500 dark:text-gold-400" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-sage-500 dark:text-sage-400" />
                    )}
                    Overall Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{optimization.overallAssessment}</p>
                  {optimization.conflictDetected && (
                    <Alert variant="default" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {optimization.conflicts.length} conflict(s) detected in your timeline
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Conflicts */}
              {optimization.conflicts && optimization.conflicts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {optimization.conflicts.map((conflict: any, index: number) => (
                      <Alert key={index} variant={getSeverityVariant(conflict.severity)}>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(conflict.severity)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertTitle className="mb-0">{conflict.description}</AlertTitle>
                              <Badge variant="outline">{conflict.type}</Badge>
                            </div>
                            <AlertDescription>{conflict.suggestion}</AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {optimization.recommendations && optimization.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {optimization.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Buffer Suggestions */}
              {optimization.bufferSuggestions && optimization.bufferSuggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Buffer Time Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {optimization.bufferSuggestions.map((buffer: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            Event: {optimization.optimizedEvents.find((e: any) => e.id === buffer.eventId)?.title || buffer.eventId}
                          </span>
                          <Badge variant="secondary">
                            {buffer.currentBuffer} → {buffer.suggestedBuffer} min
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{buffer.reasoning}</p>
                        {index < optimization.bufferSuggestions.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Vendor Coordination Tips */}
              {optimization.vendorCoordinationTips && optimization.vendorCoordinationTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Coordination Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {optimization.vendorCoordinationTips.map((tip: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-sage-500 dark:text-sage-400 mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Travel Time Considerations */}
              {optimization.travelTimeConsiderations && optimization.travelTimeConsiderations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Travel Time Considerations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {optimization.travelTimeConsiderations.map((consideration: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Info className="h-4 w-4 text-cobalt-500 dark:text-cobalt-400 mt-0.5 flex-shrink-0" />
                          <span>{consideration}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
