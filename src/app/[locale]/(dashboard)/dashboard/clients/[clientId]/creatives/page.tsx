'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Briefcase, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CreativesPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()

  const utils = trpc.useUtils()

  // Queries
  const { data: creatives, isLoading } = trpc.creatives.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.creatives.getStats.useQuery({
    clientId: clientId,
  })

  if (!clientId) {
    return (
      <div className="p-6">
        <p>No client selected</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading creatives...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Creatives</h1>
          <p className="text-muted-foreground">Manage creative deliverables</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Creative Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={stats?.total || 0}
          icon={<Briefcase className="w-4 h-4" />}
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgress || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats?.completed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          color="text-red-600"
        />
      </div>

      {/* Creative Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Creative Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {creatives?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No creative jobs yet. Add your first job to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {creatives?.map((creative: any) => (
                <div
                  key={creative.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{creative.title}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {creative.job_type}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        creative.status === 'completed' ? 'bg-green-100 text-green-700' :
                        creative.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {creative.status}
                      </span>
                      {creative.priority === 'high' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {creative.description && <p>{creative.description}</p>}
                      {creative.assigned_to && <p>Assigned to: {creative.assigned_to}</p>}
                      {creative.due_date && <p>Due: {new Date(creative.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color = 'text-foreground',
}: {
  title: string
  value: number | string
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
