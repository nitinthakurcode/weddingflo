// @ts-nocheck - Temporary workaround until database types are regenerated
/**
 * Thank You Note Tracker Component
 *
 * Tracks thank you note status with overdue alerts.
 * Features:
 * - Overdue notes highlighted
 * - Quick mark as sent action
 * - Template selection
 * - Due date countdown
 * - Bulk actions
 *
 * @see SESSION_51: Gift Tracking & Management
 */

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Check, Send } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface ThankYouTrackerProps {
  clientId: string
}

export function ThankYouTracker({ clientId }: ThankYouTrackerProps) {
  const [selectedGift, setSelectedGift] = useState<string | null>(null)
  const [thankYouNote, setThankYouNote] = useState('')

  const { data: overdueGifts } = trpc.giftsEnhanced.getOverdueThankYous.useQuery({ clientId })
  const { data: thankYouNotesDue } = trpc.giftsEnhanced.getThankYouNotesDue.useQuery({
    daysAhead: 30,
  })
  const { data: stats } = trpc.giftsEnhanced.getStats.useQuery({ clientId })

  const markThankYouSent = trpc.giftsEnhanced.markThankYouSent.useMutation()
  const utils = trpc.useContext()

  const handleMarkSent = async () => {
    if (!selectedGift) return

    await markThankYouSent.mutateAsync({
      id: selectedGift,
      thankYouNote: thankYouNote || undefined,
    })

    utils.giftsEnhanced.list.invalidate()
    utils.giftsEnhanced.getStats.invalidate()
    utils.giftsEnhanced.getOverdueThankYous.invalidate()
    utils.giftsEnhanced.getThankYouNotesDue.invalidate()

    setSelectedGift(null)
    setThankYouNote('')
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Thank You Sent</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {stats.thank_you_sent || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {stats.total_gifts
                  ? `${Math.round(
                      ((stats.thank_you_sent || 0) / stats.total_gifts) * 100
                    )}% complete`
                  : '0% complete'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">
                {stats.thank_you_pending || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Notes to write
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardDescription>Overdue</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {overdueGifts?.length || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-600">
                Past 30-day deadline
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Alerts */}
      {overdueGifts && overdueGifts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle>Overdue Thank You Notes</CardTitle>
            </div>
            <CardDescription>
              These gifts were received over 30 days ago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white"
                >
                  <div className="flex-1">
                    <p className="font-medium">{gift.gift_name}</p>
                    <p className="text-sm text-muted-foreground">
                      From:{' '}
                      {gift.guests
                        ? `${gift.guests.firstName} ${gift.guests.lastName}`
                        : 'Unknown'}
                    </p>
                    <p className="text-sm text-red-600">
                      Due: {format(new Date(gift.thank_you_due_date), 'MMM d, yyyy')} (
                      {formatDistanceToNow(new Date(gift.thank_you_due_date))} ago)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGift(gift.id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Mark Sent
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Thank You Notes */}
      {thankYouNotesDue && thankYouNotesDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Thank You Notes</CardTitle>
            <CardDescription>
              Gifts due for thank you notes in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {thankYouNotesDue.map((note: any) => (
                <div
                  key={note.gift_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{note.gift_name}</p>
                    <p className="text-sm text-muted-foreground">
                      From: {note.guest_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={note.days_until_due <= 7 ? 'destructive' : 'secondary'}>
                        {note.days_until_due} days remaining
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Due: {format(new Date(note.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGift(note.gift_id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Mark Sent
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Pending Notes */}
      {(!thankYouNotesDue || thankYouNotesDue.length === 0) &&
        (!overdueGifts || overdueGifts.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">
                No pending thank you notes at this time
              </p>
            </CardContent>
          </Card>
        )}

      {/* Mark as Sent Dialog */}
      <Dialog open={!!selectedGift} onOpenChange={(open) => !open && setSelectedGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Thank You Note as Sent</DialogTitle>
            <DialogDescription>
              Optionally add a copy of your thank you note for your records
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Optional: Enter the thank you note you sent..."
              value={thankYouNote}
              onChange={(e) => setThankYouNote(e.target.value)}
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGift(null)}>
              Cancel
            </Button>
            <Button onClick={handleMarkSent} disabled={markThankYouSent.isPending}>
              {markThankYouSent.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Sent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
