import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { users, clients } from '@/lib/db/schema';
import { getTranslations, getLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, Clock, MapPin, FileText, Mail, Phone } from 'lucide-react';

export default async function PortalWeddingPage() {
  const t = await getTranslations('portalWedding');
  const tc = await getTranslations('common');
  const locale = await getLocale();

  // Get BetterAuth user ID
  const { userId, user } = await getServerSession();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  // Fetch user role from database using Drizzle
  const userResult = await db
    .select({ role: users.role, companyId: users.companyId })
    .from(users)
    .where(eq(users.authId, userId))
    .limit(1);

  const currentUser = userResult[0] || null;

  // Verify client access
  if (!currentUser || currentUser.role !== 'client_user') {
    redirect(`/${locale}/dashboard`);
  }

  if (!currentUser?.companyId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{tc('noCompanyAssociated')}</p>
      </div>
    );
  }

  // Fetch client/wedding data using Drizzle
  const clientResult = await db
    .select({
      id: clients.id,
      partner1FirstName: clients.partner1FirstName,
      partner1LastName: clients.partner1LastName,
      partner1Email: clients.partner1Email,
      partner1Phone: clients.partner1Phone,
      partner2FirstName: clients.partner2FirstName,
      partner2LastName: clients.partner2LastName,
      weddingDate: clients.weddingDate,
      venue: clients.venue,
      notes: clients.notes,
      budget: clients.budget,
      status: clients.status,
    })
    .from(clients)
    .where(eq(clients.companyId, currentUser.companyId))
    .limit(1);

  const clientData = clientResult[0] || null;
  // Transform to expected shape
  const client = clientData ? {
    id: clientData.id,
    partner1_name: [clientData.partner1FirstName, clientData.partner1LastName].filter(Boolean).join(' '),
    partner2_name: [clientData.partner2FirstName, clientData.partner2LastName].filter(Boolean).join(' '),
    email: clientData.partner1Email,
    phone: clientData.partner1Phone,
    wedding_date: clientData.weddingDate,
    wedding_time: null,
    venue_name: clientData.venue,
    venue_address: null,
    notes: clientData.notes,
    budget: clientData.budget,
    status: clientData.status,
  } : null;

  if (!client) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">{t('noWeddingDetails')}</p>
        <p className="text-gray-400 text-sm mt-2">{t('contactPlannerSetup')}</p>
      </div>
    );
  }

  const coupleNames = client.partner1_name && client.partner2_name
    ? `${client.partner1_name} & ${client.partner2_name}`
    : t('yourWedding');

  // Format wedding date
  let weddingDateFormatted = null;
  if (client.wedding_date) {
    const weddingDate = new Date(client.wedding_date);
    weddingDateFormatted = weddingDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 mb-4">
          <Heart className="h-8 w-8 text-white fill-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">{coupleNames}</h1>
        <p className="text-lg text-gray-600">{t('yourWeddingDetails')}</p>
      </div>

      {/* Wedding Date & Time */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-900">
              <Calendar className="h-5 w-5 text-rose-600" />
              {t('weddingDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {weddingDateFormatted || t('dateToBeDetermined')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-900">
              <Clock className="h-5 w-5 text-pink-600" />
              {t('weddingTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {client.wedding_time || t('timeToBeDetermined')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Venue Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-rose-600" />
            {t('venue')}
          </CardTitle>
          <CardDescription>{t('whereSpecialDay')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">{t('venueName')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {client.venue_name || t('venueToBeDetermined')}
            </p>
          </div>
          {client.venue_address && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t('address')}</p>
              <p className="text-gray-900">{client.venue_address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Couple Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-600" />
            {t('coupleInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t('partner1')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {client.partner1_name || tc('na')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t('partner2')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {client.partner2_name || tc('na')}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('contactInformation')}</p>
            <div className="space-y-2">
              {client.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-rose-600" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-rose-600" />
                  <span>{client.phone}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose-600" />
              {t('notesFromPlanner')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Budget & Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {client.budget && (
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-700">{tc('budget')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                ${Number(client.budget).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-700">{t('planningStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {t(`status.${client.status || 'active'}`)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
