'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const emailFormSchema = z.object({
  emailType: z.enum([
    'wedding_invitation',
    'vendor_inquiry',
    'thank_you_note',
    'rsvp_followup',
    'save_the_date',
    'wedding_update',
    'vendor_coordination',
    'custom'
  ]),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional', 'elegant', 'warm']),
  recipientName: z.string().max(100).optional(),
  senderName: z.string().max(100).optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().max(200).optional(),
  specificDetails: z.string().max(1000).optional(),
  customInstructions: z.string().max(500).optional(),
})

type EmailFormData = z.infer<typeof emailFormSchema>

const EMAIL_TYPES = [
  { value: 'wedding_invitation', label: 'Wedding Invitation', icon: '💌' },
  { value: 'save_the_date', label: 'Save the Date', icon: '📅' },
  { value: 'vendor_inquiry', label: 'Vendor Inquiry', icon: '🤝' },
  { value: 'vendor_coordination', label: 'Vendor Coordination', icon: '📋' },
  { value: 'thank_you_note', label: 'Thank You Note', icon: '🙏' },
  { value: 'rsvp_followup', label: 'RSVP Follow-up', icon: '📬' },
  { value: 'wedding_update', label: 'Wedding Update', icon: '📢' },
  { value: 'custom', label: 'Custom Email', icon: '✍️' },
]

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Traditional and professional' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
  { value: 'professional', label: 'Professional', description: 'Business-like and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'warm', label: 'Warm', description: 'Personal and heartfelt' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
]

export default function EmailGeneratorPage() {
  const [generatedEmail, setGeneratedEmail] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { toast } = useToast()

  // Get AI usage
  const { data: usage } = trpc.ai.getUsage.useQuery()

  // Generate email mutation
  const generateEmail = trpc.ai.generateEmail.useMutation({
    onSuccess: (data) => {
      setGeneratedEmail(data.data)
      setIsGenerating(false)
      toast({
        title: 'Email generated!',
        description: 'Your AI-powered email is ready.',
      })
    },
    onError: (error) => {
      setIsGenerating(false)
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      emailType: 'wedding_invitation',
      tone: 'elegant',
    },
  })

  const emailType = watch('emailType')

  const onSubmit = async (data: EmailFormData) => {
    setIsGenerating(true)
    setGeneratedEmail(null)

    try {
      await generateEmail.mutateAsync(data)
    } catch (error) {
      // Error handled in onError callback
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
      toast({
        title: 'Copied!',
        description: 'Text copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              AI Email Generator
            </h1>
            <p className="text-muted-foreground mt-2">
              Create professional wedding emails in seconds
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Email Details</CardTitle>
              <CardDescription>
                Tell us about the email you want to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Type */}
                <div className="space-y-2">
                  <Label htmlFor="emailType">Email Type</Label>
                  <Controller
                    name="emailType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="emailType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMAIL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Controller
                    name="tone"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="tone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((tone) => (
                            <SelectItem key={tone.value} value={tone.value}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{tone.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tone.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Recipient Name */}
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                  <Input
                    id="recipientName"
                    placeholder="John Smith"
                    {...register('recipientName')}
                  />
                  {errors.recipientName && (
                    <p className="text-sm text-destructive">{errors.recipientName.message}</p>
                  )}
                </div>

                {/* Sender Name */}
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name (Optional)</Label>
                  <Input
                    id="senderName"
                    placeholder="Sarah & Michael"
                    {...register('senderName')}
                  />
                  {errors.senderName && (
                    <p className="text-sm text-destructive">{errors.senderName.message}</p>
                  )}
                </div>

                {/* Event Date */}
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date (Optional)</Label>
                  <Input
                    id="eventDate"
                    placeholder="June 15, 2025"
                    {...register('eventDate')}
                  />
                </div>

                {/* Event Location */}
                <div className="space-y-2">
                  <Label htmlFor="eventLocation">Event Location (Optional)</Label>
                  <Input
                    id="eventLocation"
                    placeholder="Grand Ballroom, New York"
                    {...register('eventLocation')}
                  />
                </div>

                {/* Specific Details */}
                <div className="space-y-2">
                  <Label htmlFor="specificDetails">Specific Details (Optional)</Label>
                  <Textarea
                    id="specificDetails"
                    placeholder="Include any specific information you want in the email..."
                    rows={3}
                    {...register('specificDetails')}
                  />
                  {errors.specificDetails && (
                    <p className="text-sm text-destructive">{errors.specificDetails.message}</p>
                  )}
                </div>

                {/* Custom Instructions (for custom email type) */}
                {emailType === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="customInstructions">Custom Instructions</Label>
                    <Textarea
                      id="customInstructions"
                      placeholder="Describe what kind of email you want..."
                      rows={3}
                      {...register('customInstructions')}
                    />
                    {errors.customInstructions && (
                      <p className="text-sm text-destructive">{errors.customInstructions.message}</p>
                    )}
                  </div>
                )}

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
                      Generating Email...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Email
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
                  <p className="text-lg font-medium">Crafting your email...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is writing personalized content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isGenerating && !generatedEmail && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No email generated yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Fill in the details and click &quot;Generate Email&quot; to create your AI-powered content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {generatedEmail && !isGenerating && (
            <div className="space-y-6">
              {/* Subject Line */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base">Subject Line</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedEmail.response.subject, 'subject')}
                    >
                      {copiedField === 'subject' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg">{generatedEmail.response.subject}</p>
                </CardContent>
              </Card>

              {/* Email Body */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base">Email Body</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedEmail.response.body, 'body')}
                    >
                      {copiedField === 'body' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                    {generatedEmail.response.body}
                  </div>
                </CardContent>
              </Card>

              {/* Variations */}
              {generatedEmail.response.variations && generatedEmail.response.variations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Alternative Variations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedEmail.response.variations.map((variation: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Subject Line {index + 1}
                          </p>
                          <p className="text-sm mt-1">{variation.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Opening Line {index + 1}
                          </p>
                          <p className="text-sm mt-1 italic">{variation.openingLine}</p>
                        </div>
                        {index < generatedEmail.response.variations.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Suggestions */}
              {generatedEmail.response.suggestions && generatedEmail.response.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Improvement Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {generatedEmail.response.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Copy Full Email Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(
                  `Subject: ${generatedEmail.response.subject}\n\n${generatedEmail.response.body}`,
                  'full'
                )}
              >
                {copiedField === 'full' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied Full Email!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Full Email
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
