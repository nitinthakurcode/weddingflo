'use client';

import { trpc } from '@/lib/trpc/client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChatBox } from '@/components/chat/ChatBox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { type Database } from '@/lib/database.types';

type Client = Database["public"]["Tables"]["clients"]["Row"];
type EventStatus = Database["public"]["Enums"]["event_status"];
import { Loader2, Plus, Search, Calendar, Users, CheckCircle2, AlertCircle, MessageCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';

interface CreateClientForm {
  partner1_first_name: string;
  partner1_last_name: string;
  partner1_email: string;
  partner1_phone?: string;
  partner2_first_name?: string;
  partner2_last_name?: string;
  partner2_email?: string;
  partner2_phone?: string;
  wedding_date?: string;
  venue?: string;
  budget?: number;
  guest_count?: number;
  notes?: string;
}

export default function DashboardPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    clientId: string | null;
    clientUserId: string | null;
    clientName: string | null;
  }>({
    isOpen: false,
    clientId: null,
    clientUserId: null,
    clientName: null,
  });
  const [currentUserDbId, setCurrentUserDbId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const { toast } = useToast();

  const { data: clients, isLoading, error, refetch } = trpc.clients.list.useQuery(
    { search },
    {
      refetchOnWindowFocus: false,
      retry: 3, // Retry failed requests 3 times
      retryDelay: 1000, // Wait 1 second between retries
    }
  ) as { data: Client[] | undefined; isLoading: boolean; error: any; refetch: () => void };

  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      reset();
      toast({
        title: 'Success',
        description: 'Client created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      });
    },
  });

  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete client',
        variant: 'destructive',
      });
    },
  });

  // Get current user's database ID for chat
  const { data: currentUser } = trpc.users.getCurrentUser.useQuery();

  useEffect(() => {
    if (currentUser) {
      setCurrentUserDbId(currentUser.id);
      setCurrentUserName(currentUser.name || 'You');
    }
  }, [currentUser]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateClientForm>();

  const onSubmit = (data: CreateClientForm) => {
    createClient.mutate({
      ...data,
      budget: data.budget ? Number(data.budget) : undefined,
      guest_count: data.guest_count ? Number(data.guest_count) : undefined,
    });
  };

  // Calculate metrics
  const totalClients = clients?.length || 0;

  const upcomingWeddings = clients?.filter((c) => {
    if (!c.wedding_date) return false;
    const date = new Date(c.wedding_date);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return date.getTime() - now.getTime() < thirtyDays && date.getTime() > now.getTime();
  }).length || 0;

  const confirmedClients = clients?.filter((c) => c.status === 'confirmed').length || 0;

  const planningClients = clients?.filter((c) => c.status === 'planning').length || 0;

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleDelete = (id: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete ${clientName}? This will set their status to CANCELED.`)) {
      deleteClient.mutate({ id });
    }
  };

  const openChat = (client: Client) => {
    const clientName = `${client.partner1_first_name} ${client.partner1_last_name}`;
    setChatState({
      isOpen: true,
      clientId: client.id,
      clientUserId: client.created_by, // User who created the client
      clientName,
    });
  };

  const closeChat = () => {
    setChatState({
      isOpen: false,
      clientId: null,
      clientUserId: null,
      clientName: null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load clients</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your wedding clients and track progress</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new wedding client profile. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Partner 1 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Partner 1 Information *</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner1_first_name">First Name *</Label>
                    <Input
                      id="partner1_first_name"
                      {...register('partner1_first_name', {
                        required: 'First name is required',
                      })}
                      placeholder="John"
                    />
                    {errors.partner1_first_name && (
                      <p className="text-sm text-destructive">{errors.partner1_first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner1_last_name">Last Name *</Label>
                    <Input
                      id="partner1_last_name"
                      {...register('partner1_last_name', {
                        required: 'Last name is required',
                      })}
                      placeholder="Smith"
                    />
                    {errors.partner1_last_name && (
                      <p className="text-sm text-destructive">{errors.partner1_last_name.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner1_email">Email *</Label>
                    <Input
                      id="partner1_email"
                      type="email"
                      {...register('partner1_email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      placeholder="john@example.com"
                    />
                    {errors.partner1_email && (
                      <p className="text-sm text-destructive">{errors.partner1_email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner1_phone">Phone</Label>
                    <Input
                      id="partner1_phone"
                      type="tel"
                      {...register('partner1_phone')}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Partner 2 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Partner 2 Information (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner2_first_name">First Name</Label>
                    <Input
                      id="partner2_first_name"
                      {...register('partner2_first_name')}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner2_last_name">Last Name</Label>
                    <Input
                      id="partner2_last_name"
                      {...register('partner2_last_name')}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner2_email">Email</Label>
                    <Input
                      id="partner2_email"
                      type="email"
                      {...register('partner2_email', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      placeholder="jane@example.com"
                    />
                    {errors.partner2_email && (
                      <p className="text-sm text-destructive">{errors.partner2_email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner2_phone">Phone</Label>
                    <Input
                      id="partner2_phone"
                      type="tel"
                      {...register('partner2_phone')}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>
              </div>

              {/* Wedding Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Wedding Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wedding_date">Wedding Date</Label>
                    <Input
                      id="wedding_date"
                      type="date"
                      {...register('wedding_date')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      {...register('venue')}
                      placeholder="The Grand Ballroom"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="0"
                      step="100"
                      {...register('budget')}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest_count">Guest Count</Label>
                    <Input
                      id="guest_count"
                      type="number"
                      min="1"
                      {...register('guest_count')}
                      placeholder="150"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    {...register('notes')}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Client
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Wedding couples</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Weddings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingWeddings}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedClients}</div>
            <p className="text-xs text-muted-foreground">Ready to go</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planning</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planningClients}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Features Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5"
          onClick={() => router.push(`/${locale}/dashboard/ai/budget-prediction`)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Budget Prediction
              </CardTitle>
              <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                New
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get intelligent budget estimates powered by GPT-4. Enter wedding details and receive instant, accurate predictions.
            </p>
            <Button className="w-full" variant="outline">
              Try AI Budget Prediction →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {!clients || clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">No clients found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Try adjusting your search' : 'Get started by adding your first client'}
                </p>
              </div>
              {!search && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Wedding Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>
                            {client.partner1_first_name} {client.partner1_last_name}
                            {client.partner2_first_name && (
                              <span className="text-muted-foreground">
                                {' '}
                                & {client.partner2_first_name} {client.partner2_last_name}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{client.partner1_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(client.wedding_date)}</TableCell>
                      <TableCell>{client.venue || 'Not set'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            client.status
                          )}`}
                        >
                          {client.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <ChatButton clientId={client.id} onClick={() => openChat(client)} />
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              client.id,
                              `${client.partner1_first_name} ${client.partner1_last_name}`
                            )
                          }
                          disabled={deleteClient.isPending}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Modal */}
      <Dialog open={chatState.isOpen} onOpenChange={closeChat}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Chat with {chatState.clientName}</DialogTitle>
          </DialogHeader>

          {chatState.isOpen &&
            chatState.clientId &&
            chatState.clientUserId &&
            currentUserDbId && (
              <div className="flex-1 flex flex-col min-h-0 pb-6">
                <ChatBox
                  clientId={chatState.clientId}
                  currentUserId={currentUserDbId}
                  otherUserId={chatState.clientUserId}
                  currentUserName={currentUserName}
                  otherUserName={chatState.clientName || 'Client'}
                />
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Chat button with unread badge component
function ChatButton({ clientId, onClick }: { clientId: string; onClick: () => void }) {
  const { data: unreadCount } = trpc.messages.getUnreadCount.useQuery({
    clientId,
  });

  return (
    <Button onClick={onClick} variant="outline" size="sm" className="relative">
      <MessageCircle className="w-4 h-4 mr-2" />
      Chat
      {unreadCount && unreadCount.count > 0 && (
        <Badge
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
          variant="destructive"
        >
          {unreadCount.count}
        </Badge>
      )}
    </Button>
  );
}
