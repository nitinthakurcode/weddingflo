'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { CompanyInfoStep } from '@/components/onboarding/CompanyInfoStep'
import { PreferencesStep } from '@/components/onboarding/PreferencesStep'
import { FirstClientStep } from '@/components/onboarding/FirstClientStep'
import { CompletionStep } from '@/components/onboarding/CompletionStep'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [clientCreated, setClientCreated] = useState(false)

  // Get existing onboarding status
  const { data: status, isLoading: statusLoading } = trpc.onboarding.getStatus.useQuery()
  const updateProgress = trpc.onboarding.updateProgress.useMutation()
  const completeOnboarding = trpc.onboarding.complete.useMutation()
  const skipOnboarding = trpc.onboarding.skip.useMutation()

  // tRPC mutations for saving data
  const createClient = trpc.clients.create.useMutation()
  const updateCompany = trpc.companies.update.useMutation()
  const updateUserPreferences = trpc.users.updatePreferences.useMutation()

  // Load existing data if resuming
  useEffect(() => {
    if (status && !statusLoading) {
      setIsLoading(false)

      // If already completed, redirect to dashboard
      if (status.completed) {
        router.push(`/${locale}/dashboard/clients`)
        return
      }

      // Resume from last step
      if (status.currentStep && status.currentStep > 0) {
        setCurrentStep(status.currentStep)
        setOnboardingData((status.data as Record<string, any>) || {})
      }
    }
  }, [status, statusLoading, router])

  // Calculate progress percentage
  const progressPercentage = (currentStep / 5) * 100

  // Handle step navigation
  const handleNext = async (stepData?: any) => {
    const newData = { ...onboardingData, ...stepData }
    setOnboardingData(newData)

    // Auto-save progress
    await updateProgress.mutateAsync({
      step: currentStep,
      data: newData,
    })

    // Move to next step
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle skip onboarding
  const handleSkip = async () => {
    try {
      await skipOnboarding.mutateAsync()
      router.push(`/${locale}/dashboard/clients`)
    } catch (error) {
      console.error('Failed to skip onboarding:', error)
    }
  }

  // Handle step 2: Save company info
  const handleCompanyInfo = async (data: any) => {
    try {
      await updateCompany.mutateAsync({
        name: data.name,
      })
      await handleNext(data)
    } catch (error) {
      console.error('Failed to save company info:', error)
    }
  }

  // Handle step 3: Save preferences
  const handlePreferences = async (data: any) => {
    try {
      await updateUserPreferences.mutateAsync({
        preferred_currency: data.currency,
        preferred_language: data.language,
        timezone: data.timezone,
      })
      await handleNext(data)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  // Handle step 4: Create first client (or skip)
  const handleFirstClient = async (data: any) => {
    if (data) {
      try {
        await createClient.mutateAsync({
          partner1_first_name: data.partner1_name.split(' ')[0],
          partner1_last_name: data.partner1_name.split(' ').slice(1).join(' ') || data.partner1_name.split(' ')[0],
          partner1_email: data.email,
          partner1_phone: data.phone,
          partner2_first_name: data.partner2_name.split(' ')[0],
          partner2_last_name: data.partner2_name.split(' ').slice(1).join(' ') || data.partner2_name.split(' ')[0],
          wedding_date: data.wedding_date.toISOString(),
        })
        setClientCreated(true)
      } catch (error) {
        console.error('Failed to create client:', error)
      }
    }
    await handleNext(data)
  }

  // Handle completion
  const handleComplete = async () => {
    try {
      await completeOnboarding.mutateAsync()
      router.push(`/${locale}/dashboard/clients`)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    }
  }

  if (isLoading || statusLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Progress bar */}
      {currentStep > 1 && currentStep < 5 && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep - 1} of 4</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="animate-in fade-in-50 duration-500">
        {currentStep === 1 && (
          <WelcomeStep onNext={() => handleNext()} onSkip={handleSkip} />
        )}

        {currentStep === 2 && (
          <CompanyInfoStep
            onNext={handleCompanyInfo}
            onBack={handleBack}
            initialData={onboardingData}
          />
        )}

        {currentStep === 3 && (
          <PreferencesStep
            onNext={handlePreferences}
            onBack={handleBack}
            initialData={onboardingData}
          />
        )}

        {currentStep === 4 && (
          <FirstClientStep
            onNext={handleFirstClient}
            onBack={handleBack}
            initialData={onboardingData}
          />
        )}

        {currentStep === 5 && (
          <CompletionStep
            onComplete={handleComplete}
            clientCreated={clientCreated}
          />
        )}
      </div>
    </div>
  )
}
