'use client';

import { trpc } from '@/lib/trpc/client';
import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useTranslations } from 'next-intl';
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
import type { Client, EventStatus } from '@/lib/db/types';
import { Loader2, Plus, Search, Calendar, Users, CheckCircle2, AlertCircle, MessageCircle, Sparkles, CalendarDays, Heart, TrendingUp, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/navigation';
import { LoadingShimmer, SlideUpItem } from '@/components/ui/micro-interactions';
import { RevenueWidget } from '@/components/dashboard/revenue-widget';
import { RecentBookingsWidget } from '@/components/dashboard/recent-bookings-widget';
import { DashboardTourTrigger } from '@/components/onboarding/tour-trigger';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';

interface CreateClientForm {
  wedding_name?: string; // Title/Wedding Name
  partner1_first_name: string;
  partner1_last_name: string;
  partner1_email: string;
  partner1_phone?: string;
  partner1_father_name?: string;
  partner1_mother_name?: string;
  partner2_first_name?: string;
  partner2_last_name?: string;
  partner2_email?: string;
  partner2_phone?: string;
  partner2_father_name?: string;
  partner2_mother_name?: string;
  wedding_date?: string;
  venue?: string;
  budget?: number;
  guest_count?: number;
  notes?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
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
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const { toast } = useToast();

  const utils = trpc.useUtils();

  const { data: clients, isLoading, error, refetch } = trpc.clients.list.useQuery(
    { search },
    {
      refetchOnWindowFocus: false,
      retry: 3, // Retry failed requests 3 times
      retryDelay: 1000, // Wait 1 second between retries
    }
  ) as { data: Client[] | undefined; isLoading: boolean; error: any; refetch: () => void };

  const createClient = trpc.clients.create.useMutation({
    onSuccess: async () => {
      setIsCreateOpen(false);
      reset();
      toast({
        title: tc('success'),
        description: t('clientCreated'),
      });
      // Invalidate global cache to update stats everywhere
      // Also invalidate events since we auto-create a main wedding event
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.events.invalidate(), // Auto-created event needs to appear in events pages
      ]);
    },
    onError: (error) => {
      toast({
        title: tc('error'),
        description: error.message || t('createFailed'),
        variant: 'destructive',
      });
    },
  });

  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: async () => {
      toast({
        title: tc('success'),
        description: t('clientDeleted'),
      });
      // Invalidate global cache to update stats everywhere
      await utils.clients.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: tc('error'),
        description: error.message || t('deleteFailed'),
        variant: 'destructive',
      });
    },
  });

  // Get current user's database ID for chat
  const { data: currentUser } = trpc.users.getCurrentUser.useQuery();

  useEffect(() => {
    if (currentUser) {
      setCurrentUserDbId(currentUser.id);
      setCurrentUserName(currentUser.name || tc('you'));
    }
  }, [currentUser, tc]);

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

  // All future weddings (any date in the future)
  const allFutureWeddings = clients?.filter((c) => {
    if (!c.weddingDate) return false;
    const date = new Date(c.weddingDate);
    return date.getTime() > Date.now();
  }).length || 0;

  // Upcoming weddings (within next 30 days)
  const upcomingWeddings = clients?.filter((c) => {
    if (!c.weddingDate) return false;
    const date = new Date(c.weddingDate);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return date.getTime() - now.getTime() < thirtyDays && date.getTime() > now.getTime();
  }).length || 0;

  const confirmedClients = clients?.filter((c) => c.status === 'confirmed').length || 0;

  const planningClients = clients?.filter((c) => c.status === 'planning').length || 0;

  // Dec 2025 Theme-aligned status colors - Sage, Champagne, Rose palette
  const getStatusVariant = (status: EventStatus): 'success' | 'info' | 'warning' | 'confirmed' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'confirmed':
        return 'success'; // Sage green - fresh, nature
      case 'planning':
        return 'info'; // Cobalt blue - trust, progress
      case 'in_progress':
        return 'warning'; // Gold - energy, action
      case 'completed':
        return 'confirmed'; // Sage green - achievement
      case 'cancelled':
        return 'destructive'; // Rose red - attention
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notSet');
    try {
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return t('invalidDate');
    }
  };

  const handleDelete = (id: string, clientName: string) => {
    if (confirm(t('deleteConfirm'))) {
      deleteClient.mutate({ id });
    }
  };

  const openChat = (client: Client) => {
    const clientName = client.partner1LastName
      ? `${client.partner1FirstName} ${client.partner1LastName}`
      : client.partner1FirstName;
    setChatState({
      isOpen: true,
      clientId: client.id,
      clientUserId: client.createdBy, // User who created the client
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
      <div className="space-y-6 p-4 sm:p-6">
        {/* Shimmer Header */}
        <div className="flex flex-col gap-4">
          <LoadingShimmer className="h-8 w-48" />
          <LoadingShimmer className="h-4 w-64" />
        </div>
        {/* Shimmer Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <LoadingShimmer className="h-4 w-20" />
              <LoadingShimmer className="h-8 w-12" />
              <LoadingShimmer className="h-3 w-16" />
            </Card>
          ))}
        </div>
        {/* Shimmer Table */}
        <Card className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <LoadingShimmer key={i} className="h-12 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{tc('failedToLoad')}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()}>{tc('tryAgain')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-24 sm:pb-6">
      {/* Tour Trigger - auto-starts after onboarding */}
      <DashboardTourTrigger />

      {/* Onboarding Checklist - shows until all items complete */}
      <OnboardingChecklist className="mb-2" />

      {/* Header - Mobile Optimized */}
      <SlideUpItem delay={0}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('subtitle')}</p>
          </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('addClient')}
            </Button>
          </DialogTrigger>
          <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('addNewClient')}</DialogTitle>
              <DialogDescription>
                {t('createClientDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Wedding Name / Title */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">{t('weddingTitle')}</h3>
                <div className="space-y-2">
                  <Label htmlFor="wedding_name">{t('weddingName')}</Label>
                  <Input
                    id="wedding_name"
                    {...register('wedding_name')}
                    placeholder={t('weddingNamePlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('weddingNameHint')}</p>
                </div>
              </div>

              {/* Partner 1 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">{t('partner1Info')} *</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner1_first_name">{t('firstName')} *</Label>
                    <Input
                      id="partner1_first_name"
                      {...register('partner1_first_name', {
                        required: tc('firstNameRequired'),
                      })}
                      placeholder="John"
                    />
                    {errors.partner1_first_name && (
                      <p className="text-sm text-destructive">{errors.partner1_first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner1_last_name">{t('lastName')} *</Label>
                    <Input
                      id="partner1_last_name"
                      {...register('partner1_last_name', {
                        required: tc('lastNameRequired'),
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
                    <Label htmlFor="partner1_email">{t('email')} *</Label>
                    <Input
                      id="partner1_email"
                      type="email"
                      {...register('partner1_email', {
                        required: tc('emailRequired'),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: tc('invalidEmailAddress'),
                        },
                      })}
                      placeholder="john@example.com"
                    />
                    {errors.partner1_email && (
                      <p className="text-sm text-destructive">{errors.partner1_email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner1_phone">{t('phone')}</Label>
                    <Input
                      id="partner1_phone"
                      type="tel"
                      {...register('partner1_phone')}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                {/* Family Details - Partner 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="partner1_father_name">{t('fatherName')}</Label>
                    <Input
                      id="partner1_father_name"
                      {...register('partner1_father_name')}
                      placeholder={t('fatherNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner1_mother_name">{t('motherName')}</Label>
                    <Input
                      id="partner1_mother_name"
                      {...register('partner1_mother_name')}
                      placeholder={t('motherNamePlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Partner 2 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">{t('partner2Info')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner2_first_name">{t('firstName')}</Label>
                    <Input
                      id="partner2_first_name"
                      {...register('partner2_first_name')}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner2_last_name">{t('lastName')}</Label>
                    <Input
                      id="partner2_last_name"
                      {...register('partner2_last_name')}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner2_email">{t('email')}</Label>
                    <Input
                      id="partner2_email"
                      type="email"
                      {...register('partner2_email', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: tc('invalidEmailAddress'),
                        },
                      })}
                      placeholder="jane@example.com"
                    />
                    {errors.partner2_email && (
                      <p className="text-sm text-destructive">{errors.partner2_email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner2_phone">{t('phone')}</Label>
                    <Input
                      id="partner2_phone"
                      type="tel"
                      {...register('partner2_phone')}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>
                {/* Family Details - Partner 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="partner2_father_name">{t('fatherName')}</Label>
                    <Input
                      id="partner2_father_name"
                      {...register('partner2_father_name')}
                      placeholder={t('fatherNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner2_mother_name">{t('motherName')}</Label>
                    <Input
                      id="partner2_mother_name"
                      {...register('partner2_mother_name')}
                      placeholder={t('motherNamePlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Wedding Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">{tc('weddingDetails')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wedding_date">{t('weddingDate')}</Label>
                    <Input
                      id="wedding_date"
                      type="date"
                      {...register('wedding_date')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">{t('venue')}</Label>
                    <Input
                      id="venue"
                      {...register('venue')}
                      placeholder="The Grand Ballroom"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">{tc('budget')}</Label>
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
                    <Label htmlFor="guest_count">{tc('guestCount')}</Label>
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
                  <Label htmlFor="notes">{tc('notes')}</Label>
                  <Input
                    id="notes"
                    {...register('notes')}
                    placeholder={tc('additionalNotes')}
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
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('createClient')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </SlideUpItem>

      {/* Metrics Cards - Clean Professional Design */}
      <SlideUpItem delay={100}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Clients */}
          <Card className="group hover:shadow-lg transition-all duration-200 bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{t('totalClients')}</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('weddingCouples')}</p>
            </CardContent>
          </Card>

          {/* Future Weddings */}
          <Card className="group hover:shadow-lg transition-all duration-200 bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium hidden sm:block">{t('allFutureWeddings') || 'Future'}</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{allFutureWeddings}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('allScheduled') || 'All scheduled'}</p>
            </CardContent>
          </Card>

          {/* Upcoming (30 days) */}
          <Card className="group hover:shadow-lg transition-all duration-200 bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
                <Badge variant="outline" className="text-[10px]">30d</Badge>
              </div>
              <div className="text-3xl font-bold text-foreground">{upcomingWeddings}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('next30Days')}</p>
            </CardContent>
          </Card>

          {/* Confirmed */}
          <Card className="group hover:shadow-lg transition-all duration-200 bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-sage-100 dark:bg-sage-900/30">
                  <CheckCircle2 className="h-4 w-4 text-sage-600 dark:text-sage-400" />
                </div>
                <TrendingUp className="h-3 w-3 text-sage-600 dark:text-sage-400" />
              </div>
              <div className="text-3xl font-bold text-foreground">{confirmedClients}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('readyToGo')}</p>
            </CardContent>
          </Card>

          {/* Planning */}
          <Card className="group hover:shadow-lg transition-all duration-200 bg-card border-border/50 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-primary">{t('planning')}</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{planningClients}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('inProgress')}</p>
            </CardContent>
          </Card>
        </div>
      </SlideUpItem>

      {/* AI Features Quick Access - Clean Professional Card */}
      <SlideUpItem delay={200}>
        <Card
          className="group cursor-pointer hover:shadow-md transition-all duration-200"
          onClick={() => router.push('/dashboard/ai/budget-prediction')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span>{t('aiBudgetPrediction')}</span>
              </CardTitle>
              <Badge variant="info">
                {t('aiBudgetNew')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('aiBudgetDescription')}
            </p>
            <Button className="w-full sm:w-auto">
              {t('tryAiBudget')} →
            </Button>
          </CardContent>
        </Card>
      </SlideUpItem>

      {/* Revenue and Bookings Widgets */}
      <SlideUpItem delay={250}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RevenueWidget />
          <RecentBookingsWidget />
        </div>
      </SlideUpItem>

      {/* Search - Mobile Optimized */}
      <SlideUpItem delay={300}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="client-search"
            name="client-search"
            placeholder={t('searchClientsPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
      </SlideUpItem>

      {/* Clients Table */}
      <SlideUpItem delay={400}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {!clients || clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Heart className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center px-4">
                  <p className="text-xl font-semibold">{t('noClientsFound')}</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    {search ? t('adjustSearch') : t('noClientsDescription')}
                  </p>
                </div>
                {!search && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addClient')}
                  </Button>
                )}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('weddingTitle')}</TableHead>
                    <TableHead>{t('clientName')}</TableHead>
                    <TableHead>{t('weddingDate')}</TableHead>
                    <TableHead>{t('venue')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.weddingName || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>
                            {client.partner1FirstName}{client.partner1LastName && ` ${client.partner1LastName}`}
                            {client.partner2FirstName && (
                              <span className="text-muted-foreground">
                                {' '}
                                & {client.partner2FirstName}{client.partner2LastName && ` ${client.partner2LastName}`}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{client.partner1Email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(client.weddingDate)}</TableCell>
                      <TableCell>{client.venue || t('notSet')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant((client.status || 'draft') as EventStatus)}
                          className="capitalize transition-spring hover:scale-105"
                        >
                          {(client.status || 'draft').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <ChatButton clientId={client.id} onClick={() => openChat(client)} chatLabel={t('chat')} />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          >
                            {t('view')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(
                                client.id,
                                client.partner1LastName
                                  ? `${client.partner1FirstName} ${client.partner1LastName}`
                                  : client.partner1FirstName
                              )
                            }
                            disabled={deleteClient.isPending}
                          >
                            {tc('delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </SlideUpItem>

      {/* Chat Modal */}
      <Dialog open={chatState.isOpen} onOpenChange={closeChat}>
        <DialogContent size="lg" className="h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{t('chatWith', { name: chatState.clientName || '' })}</DialogTitle>
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
                  otherUserName={chatState.clientName || t('client')}
                />
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Chat button with unread badge component
function ChatButton({ clientId, onClick, chatLabel }: { clientId: string; onClick: () => void; chatLabel: string }) {
  const { data: unreadCount } = trpc.messages.getUnreadCount.useQuery({
    clientId,
  });

  return (
    <Button onClick={onClick} variant="outline" size="sm" className="relative">
      <MessageCircle className="w-4 h-4 mr-2" />
      {chatLabel}
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
