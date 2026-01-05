// @ts-nocheck - Temporary workaround until database types are regenerated
/**
 * Gift List Component
 *
 * Displays all gifts for a client with comprehensive filtering and stats.
 * Features:
 * - Stats cards (total, thank you sent, pending, overdue)
 * - Data table with gift details
 * - Status badges
 * - Thank you note tracking
 * - Actions for each gift
 *
 * @see SESSION_51: Gift Tracking & Management
 */

'use client'

import { trpc } from '@/lib/trpc/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Gift, Check, Clock, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'

interface GiftListProps {
  clientId: string
  onCreateGift?: () => void
  onEditGift?: (giftId: string) => void
}

export function GiftList({ clientId, onCreateGift, onEditGift }: GiftListProps) {
  const { data: gifts, isLoading } = trpc.giftsEnhanced.list.useQuery({ clientId })
  const { data: stats } = trpc.giftsEnhanced.getStats.useQuery({ clientId })
  const deleteGift = trpc.giftsEnhanced.delete.useMutation()
  const utils = trpc.useContext()

  const handleDelete = async (giftId: string) => {
    if (!confirm('Are you sure you want to delete this gift?')) return

    await deleteGift.mutateAsync({ id: giftId })
    utils.giftsEnhanced.list.invalidate()
    utils.giftsEnhanced.getStats.invalidate()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading gifts...</div>
  }

  const columns = [
    {
      accessorKey: 'gift_name',
      header: 'Gift',
      cell: (row: any) => (
        <div>
          <p className="font-medium">{row.gift_name}</p>
          {row.description && (
            <p className="text-sm text-muted-foreground">{row.description}</p>
          )}
          {row.category_id && row.gift_categories && (
            <Badge variant="outline" className="mt-1">
              {row.gift_categories.icon} {row.gift_categories.name}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'guests',
      header: 'From',
      cell: (row: any) => {
        if (row.is_group_gift) {
          return (
            <div>
              <p className="font-medium">Group Gift</p>
              {row.group_gift_organizer && (
                <p className="text-sm text-muted-foreground">
                  Organized by {row.group_gift_organizer}
                </p>
              )}
            </div>
          )
        }

        if (!row.guests) {
          return <span className="text-muted-foreground">Unknown</span>
        }

        return `${row.guests.firstName} ${row.guests.lastName}`
      },
    },
    {
      accessorKey: 'gift_type',
      header: 'Type',
      cell: (row: any) => (
        <Badge variant="secondary">
          {row.gift_type === 'physical' && '📦 Physical'}
          {row.gift_type === 'cash' && '💵 Cash'}
          {row.gift_type === 'gift_card' && '🎁 Gift Card'}
          {row.gift_type === 'experience' && '🎭 Experience'}
        </Badge>
      ),
    },
    {
      accessorKey: 'monetary_value',
      header: 'Value',
      cell: (row: any) => {
        if (row.gift_type === 'cash' && row.monetary_value) {
          return formatCurrency(row.monetary_value, row.currency || 'USD')
        }
        if (row.estimated_value) {
          return `~${formatCurrency(row.estimated_value, row.currency || 'USD')}`
        }
        return '-'
      },
    },
    {
      accessorKey: 'delivery_status',
      header: 'Delivery',
      cell: (row: any) => {
        const statusColors: Record<string, string> = {
          ordered: 'secondary',
          shipped: 'default',
          delivered: 'default',
          returned: 'destructive',
        }

        return (
          <Badge variant={statusColors[row.delivery_status] as any || 'secondary'}>
            {row.delivery_status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'received_date',
      header: 'Received',
      cell: (row: any) => {
        if (!row.received_date) return '-'
        return format(new Date(row.received_date), 'MMM d, yyyy')
      },
    },
    {
      accessorKey: 'thank_you_sent',
      header: 'Thank You',
      cell: (row: any) => {
        if (row.thank_you_sent) {
          return (
            <div className="flex items-center text-green-600">
              <Check className="h-4 w-4 mr-1" />
              <span>Sent</span>
              {row.thank_you_sent_date && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({format(new Date(row.thank_you_sent_date), 'MMM d')})
                </span>
              )}
            </div>
          )
        }

        if (!row.received_date) {
          return <span className="text-muted-foreground">N/A</span>
        }

        const isOverdue = row.thank_you_due_date &&
          new Date(row.thank_you_due_date) < new Date()

        return (
          <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
            {isOverdue ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Overdue</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending</span>
              </>
            )}
            {row.thank_you_due_date && (
              <span className="text-xs ml-1">
                ({format(new Date(row.thank_you_due_date), 'MMM d')})
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {onEditGift && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditGift(row.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            disabled={deleteGift.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gifts</p>
                <p className="text-2xl font-bold">{stats.total_gifts || 0}</p>
              </div>
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Thank You Sent</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.thank_you_sent || 0}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.thank_you_pending || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {stats.total_value
                    ? formatCurrency(Number(stats.total_value), 'USD')
                    : '$0'}
                </p>
              </div>
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gifts</h2>
          <p className="text-muted-foreground">
            Manage wedding gifts and thank you notes
          </p>
        </div>
        {onCreateGift && (
          <Button onClick={onCreateGift}>
            <Plus className="h-4 w-4 mr-2" />
            Add Gift
          </Button>
        )}
      </div>

      {/* Gift Table */}
      {gifts && gifts.length > 0 ? (
        <DataTable columns={columns} data={gifts} />
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No gifts yet</p>
          <p className="text-muted-foreground">
            Start tracking gifts received for this wedding
          </p>
          {onCreateGift && (
            <Button onClick={onCreateGift} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Gift
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
