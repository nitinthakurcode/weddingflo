import { getServerSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { db, eq, and, inArray, asc } from '@/lib/db'
import { user, clients, companies } from '@/lib/db/schema'
import { ChatPage } from './ChatPage'

export default async function PortalChatPage() {
  const { userId, user: sessionUser } = await getServerSession()

  // Get locale from headers for proper redirects
  const headersList = await headers()
  const url = headersList.get('x-url') || headersList.get('referer') || ''
  const localeMatch = url.match(/\/([a-z]{2})\//)
  const locale = localeMatch ? localeMatch[1] : 'en'

  if (!userId) {
    redirect(`/${locale}/sign-in`)
  }

  const role = sessionUser?.role
  if (role !== 'client_user') {
    redirect(`/${locale}/sign-in`)
  }

  // Get current user's database record using Drizzle
  const userResult = await db
    .select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userData = userResult[0] || null;

  if (!userData || !userData.companyId) {
    redirect(`/${locale}/sign-in`)
  }

  // Get client record via company_id using Drizzle with join
  const clientResult = await db
    .select({
      id: clients.id,
      weddingName: clients.weddingName,
      companyId: clients.companyId,
      companyName: companies.name,
    })
    .from(clients)
    .leftJoin(companies, eq(clients.companyId, companies.id))
    .where(eq(clients.companyId, userData.companyId))
    .limit(1);

  const client = clientResult[0] || null;

  if (!client) {
    redirect(`/${locale}/portal`)
  }

  // Get a planner from the company to chat with using Drizzle
  const plannerResult = await db
    .select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(and(
      eq(user.companyId, client.companyId),
      inArray(user.role, ['company_admin', 'staff'])
    ))
    .orderBy(asc(user.createdAt))
    .limit(1);

  const planner = plannerResult[0] || null;

  if (!planner) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No planner assigned yet. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  // Build display names from firstName/lastName (camelCase from Drizzle)
  const currentUserName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 'You'
  const plannerDisplayName = [planner.firstName, planner.lastName].filter(Boolean).join(' ') || 'Wedding Planner'

  return (
    <ChatPage
      clientId={client.id}
      currentUserId={userData.id}
      currentUserName={currentUserName}
      plannerUserId={planner.id}
      plannerName={plannerDisplayName}
      companyName={client.companyName || ''}
    />
  )
}
