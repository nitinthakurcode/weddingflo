'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Hotel,
  Gift,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const router = useRouter()

  // Query client details
  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId }
  )

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
        <p>Loading client details...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6">
        <p>Client not found</p>
      </div>
    )
  }

  const modules = [
    {
      title: 'Guests',
      description: 'Manage guest list and RSVPs',
      icon: Users,
      href: `/dashboard/clients/${clientId}/guests`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Hotels',
      description: 'Manage guest accommodations',
      icon: Hotel,
      href: `/dashboard/clients/${clientId}/hotels`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Gifts',
      description: 'Track gifts and thank you notes',
      icon: Gift,
      href: `/dashboard/clients/${clientId}/gifts`,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Vendors',
      description: 'Manage vendors and contracts',
      icon: Briefcase,
      href: `/dashboard/clients/${clientId}/vendors`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Budget',
      description: 'Track estimated vs actual costs',
      icon: DollarSign,
      href: `/dashboard/clients/${clientId}/budget`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Events',
      description: 'Plan wedding events and schedules',
      icon: Calendar,
      href: `/dashboard/clients/${clientId}/events`,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Timeline',
      description: 'Wedding day timeline and tasks',
      icon: Clock,
      href: `/dashboard/clients/${clientId}/timeline`,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Documents',
      description: 'Store contracts and files',
      icon: FileText,
      href: `/dashboard/clients/${clientId}/documents`,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/clients')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {client.partner1_first_name} {client.partner1_last_name} & {client.partner2_first_name} {client.partner2_last_name}
            </h1>
            <p className="text-muted-foreground">Wedding planning overview</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/portal/chat?clientId=${clientId}`)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat with Client
        </Button>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {client.wedding_date && (
              <div>
                <p className="text-sm text-muted-foreground">Wedding Date</p>
                <p className="font-semibold">
                  {new Date(client.wedding_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {client.venue && (
              <div>
                <p className="text-sm text-muted-foreground">Venue</p>
                <p className="font-semibold">{client.venue}</p>
              </div>
            )}
            {client.partner1_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{client.partner1_email}</p>
              </div>
            )}
            {client.partner1_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{client.partner1_phone}</p>
              </div>
            )}
            {client.notes && (
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-semibold">{client.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planning Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => (
            <Card
              key={module.title}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
              onClick={() => router.push(module.href)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-3 rounded-full ${module.bgColor}`}>
                    <module.icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <h3 className="font-semibold">{module.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Click on any module above to start planning!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
