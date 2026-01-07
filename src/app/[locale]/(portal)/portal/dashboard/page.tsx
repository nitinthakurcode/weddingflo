import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { db, sql, eq } from '@/lib/db';
import { companies, clients, guests } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/navigation';
import { Heart, Calendar, Users, MessageSquare, Clock, MapPin } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';

export default async function PortalDashboardPage() {
  const t = await getTranslations('portal');
  const tc = await getTranslations('common');
  const locale = await getLocale();
  // Get BetterAuth session
  const { userId, user } = await getServerSession();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  // Get role and company from BetterAuth user object
  const role = (user as any).role as string | undefined;
  const companyId = (user as any).companyId as string | undefined;

  // Verify client access
  if (role !== 'client_user') {
    redirect('/dashboard');
  }

  // Fetch company info for display using Drizzle
  let companyData = null;
  if (companyId) {
    const companyResult = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    companyData = companyResult[0] || null;
  }

  const portalUser = {
    role,
    company_id: companyId,
    full_name: user.name,
    company: companyData,
  };

  if (!portalUser?.company_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('noCompanyAssociated')}</p>
      </div>
    );
  }

  // Fetch client data using Drizzle
  const clientResult = await db
    .select({
      id: clients.id,
      partner1FirstName: clients.partner1FirstName,
      partner1LastName: clients.partner1LastName,
      partner2FirstName: clients.partner2FirstName,
      partner2LastName: clients.partner2LastName,
      weddingDate: clients.weddingDate,
      venue: clients.venue,
      notes: clients.notes,
    })
    .from(clients)
    .where(eq(clients.companyId, portalUser.company_id))
    .limit(1);

  const clientData = clientResult[0] || null;
  // Transform to expected shape
  const client = clientData ? {
    id: clientData.id,
    partner1_name: [clientData.partner1FirstName, clientData.partner1LastName].filter(Boolean).join(' '),
    partner2_name: [clientData.partner2FirstName, clientData.partner2LastName].filter(Boolean).join(' '),
    wedding_date: clientData.weddingDate,
    wedding_time: null,
    venue_name: clientData.venue,
    venue_address: null,
    notes: clientData.notes,
  } : null;

  // Fetch guest count using Drizzle
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count
    FROM guests
    WHERE company_id = ${portalUser.company_id}
  `);
  const guestCount = (countResult.rows[0] as { count: number })?.count || 0;

  // Calculate days until wedding
  let daysUntilWedding = null;
  let weddingDateFormatted = null;
  if (client?.wedding_date) {
    const weddingDate = new Date(client.wedding_date);
    weddingDateFormatted = weddingDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    daysUntilWedding = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const coupleNames = client?.partner1_name && client?.partner2_name
    ? `${client.partner1_name} & ${client.partner2_name}`
    : t('yourWedding');

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {t('welcomeUser', { name: portalUser.full_name || t('friend') })}
        </h1>
        <p className="text-xl text-muted-foreground">
          {t('planningJourney')} <span className="font-semibold text-rose-600 dark:text-rose-400">{portalUser.company?.name}</span>
        </p>
      </div>

      {/* Wedding Countdown */}
      {daysUntilWedding !== null && (
        <Card
          variant="glass"
          className="group hover:scale-[1.01] transition-all duration-300 border border-rose-200/50 dark:border-rose-800/30 shadow-xl shadow-rose-500/20 bg-gradient-to-br from-rose-50 via-rose-50/50 to-gold-50/30 dark:from-rose-950/30 dark:via-rose-950/20 dark:to-gold-950/10 overflow-hidden"
        >
          <CardContent className="pt-6 relative">
            {/* Animated background orbs */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-rose-300/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-rose-300/20 rounded-full blur-2xl" />
            <div className="text-center space-y-4 relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 mb-2 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                <Heart className="h-8 w-8 text-white fill-white" />
              </div>
              <div>
                <p className="text-5xl font-bold bg-gradient-to-r from-rose-500 to-rose-600 bg-clip-text text-transparent mb-2">
                  {daysUntilWedding > 0 ? daysUntilWedding : 0}
                </p>
                <p className="text-lg text-mocha-700 dark:text-mocha-300">
                  {daysUntilWedding > 0 ? t('daysUntilWedding') : t('weddingIsToday')}
                </p>
                {weddingDateFormatted && (
                  <p className="text-sm text-muted-foreground mt-2">{weddingDateFormatted}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-cobalt-200/50 dark:border-cobalt-800/30 shadow-lg shadow-cobalt-500/10 hover:shadow-xl hover:shadow-cobalt-500/20 bg-gradient-to-br from-white via-cobalt-50/30 to-white dark:from-mocha-900 dark:via-cobalt-950/20 dark:to-mocha-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cobalt-500 to-cobalt-600 shadow-lg shadow-cobalt-500/30 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{tc('guestCount')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cobalt-600 to-cobalt-700 bg-clip-text text-transparent">
              {guestCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('peopleInvited')}</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 hover:shadow-xl hover:shadow-teal-500/20 bg-gradient-to-br from-white via-teal-50/30 to-white dark:from-mocha-900 dark:via-teal-950/20 dark:to-mocha-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{t('venue')}</span>
            </div>
            <div className="text-lg font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent truncate">
              {client?.venue_name || t('tbd')}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {client?.venue_address || t('locationPending')}
            </p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gold-200/50 dark:border-gold-800/30 shadow-lg shadow-gold-500/10 hover:shadow-xl hover:shadow-gold-500/20 bg-gradient-to-br from-white via-gold-50/30 to-white dark:from-mocha-900 dark:via-gold-950/20 dark:to-mocha-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 shadow-lg shadow-gold-500/30 group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{t('weddingTime')}</span>
            </div>
            <div className="text-lg font-bold bg-gradient-to-r from-gold-600 to-gold-700 bg-clip-text text-transparent">
              {client?.wedding_time || t('tbd')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('ceremonyStart')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Details */}
      {client && (
        <Card
          variant="glass"
          className="border border-primary-200/50 dark:border-primary-800/30 shadow-lg bg-gradient-to-br from-white via-primary-50/20 to-white dark:from-mocha-900 dark:via-primary-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              <Heart className="h-5 w-5 text-rose-600" />
              {coupleNames}
            </CardTitle>
            <CardDescription>{t('yourWeddingDetails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('partner1')}</p>
                <p className="text-foreground font-medium">{client.partner1_name || t('na')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('partner2')}</p>
                <p className="text-foreground font-medium">{client.partner2_name || t('na')}</p>
              </div>
            </div>
            {client.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('notesFromPlanner')}</p>
                <p className="text-muted-foreground text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card
        variant="glass"
        className="border border-secondary-200/50 dark:border-secondary-800/30 shadow-lg bg-gradient-to-br from-white via-secondary-50/20 to-white dark:from-mocha-900 dark:via-secondary-950/10 dark:to-mocha-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-teal-600 to-gold-600 bg-clip-text text-transparent">
            {t('quickActions')}
          </CardTitle>
          <CardDescription>{t('navigateToFeatures')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all">
              <Link href="/portal/wedding" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {t('viewWeddingDetails')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="hover:bg-cobalt-50 dark:hover:bg-cobalt-950/30 border-cobalt-200 dark:border-cobalt-800/50 hover:border-cobalt-300 transition-all">
              <Link href="/portal/guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('manageGuests')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="hover:bg-teal-50 dark:hover:bg-teal-950/30 border-teal-200 dark:border-teal-800/50 hover:border-teal-300 transition-all">
              <Link href="/portal/chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('contactPlanner')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
