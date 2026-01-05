import { getServerSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { db, eq, and, inArray, asc } from '@/lib/db'
import { users, clients, companies } from '@/lib/db/schema'
import { ChatPage } from './ChatPage'

export default async function PortalChatPage() {
  const { userId, user } = await getServerSession()

  if (!userId) {
    redirect('/sign-in')
  }

  const role = user?.role
  if (role !== 'client_user') {
    redirect('/sign-in')
  }

  // Get current user's database record using Drizzle
  const userResult = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      companyId: users.companyId,
    })
    .from(users)
    .where(eq(users.authId, userId))
    .limit(1);

  const userData = userResult[0] || null;

  if (!userData || !userData.companyId) {
    redirect('/sign-in')
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
    redirect('/portal')
  }

  // Get a planner from the company to chat with using Drizzle
  const plannerResult = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(and(
      eq(users.companyId, client.companyId),
      inArray(users.role, ['company_admin', 'staff'])
    ))
    .orderBy(asc(users.createdAt))
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
