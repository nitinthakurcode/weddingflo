'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Sparkles } from 'lucide-react'
import Confetti from 'react-confetti'
import { useWindowSize } from '@/hooks/use-window-size'

interface CompletionStepProps {
  onComplete: () => void
  clientCreated: boolean
}

export function CompletionStep({ onComplete, clientCreated }: CompletionStepProps) {
  const { width, height } = useWindowSize()

  return (
    <>
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.3}
      />
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl">You&apos;re All Set! 🎉</CardTitle>
            <CardDescription className="text-lg mt-2">
              Welcome to WeddingFlow Pro - Let&apos;s create amazing weddings together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What&apos;s Next?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {clientCreated ? 'Your first client has been created' : 'Add your wedding clients'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Set up budgets and track expenses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Create detailed wedding timelines
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Coordinate with vendors and teams
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Chat in real-time with your staff
                </li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <Button onClick={onComplete} size="lg" className="px-8">
                Go to Dashboard →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
