'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Users, Calendar, DollarSign, MessageSquare, FileText, Gift, Building2 } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
  onSkip: () => void
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to WeddingFlo! 🎉</CardTitle>
          <CardDescription className="text-lg mt-2">
            Let&apos;s get your wedding business set up in just a few minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Client Management</h3>
                <p className="text-sm text-muted-foreground">Track all your wedding clients in one place</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Timeline Planning</h3>
                <p className="text-sm text-muted-foreground">Create detailed wedding day timelines</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Budget Tracking</h3>
                <p className="text-sm text-muted-foreground">Monitor expenses and stay within budget</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Real-time Chat</h3>
                <p className="text-sm text-muted-foreground">Communicate instantly with your team</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Document Management</h3>
                <p className="text-sm text-muted-foreground">Store contracts and important files</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Gift className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Registry Tracking</h3>
                <p className="text-sm text-muted-foreground">Manage gifts and thank-you notes</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Building2 className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Vendor Coordination</h3>
                <p className="text-sm text-muted-foreground">Organize all your wedding vendors</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Task Management</h3>
                <p className="text-sm text-muted-foreground">Never miss a deadline</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
            <Button variant="ghost" onClick={onSkip}>
              Skip for Now
            </Button>
            <Button onClick={onNext} size="lg">
              Get Started →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
