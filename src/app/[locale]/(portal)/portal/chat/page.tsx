import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ChatPage } from './ChatPage'

export default async function PortalChatPage() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const role = sessionClaims?.metadata?.role
  if (role !== 'client_user') {
    redirect('/sign-in')
  }

  const supabase = await createServerSupabaseClient()

  // Get current user's database record
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('clerk_id', userId)
    .single()

  if (!user) {
    redirect('/sign-in')
  }

  // Get client record (client is linked to this user)
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      company_id,
      companies (
        id,
        name
      )
    `)
    .eq('clerk_id', userId)
    .single()

  if (!client) {
    redirect('/portal')
  }

  // Get a planner from the company to chat with
  // (usually the company admin or assigned planner)
  const { data: planner } = await supabase
    .from('users')
    .select('id, name')
    .eq('company_id', (client as any).company_id)
    .in('role', ['company_admin', 'staff'])
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

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

  const clientData = client as any
  const plannerData = planner as any
  const userData = user as any

  return (
    <ChatPage
      clientId={clientData.id}
      currentUserId={userData.id}
      currentUserName={userData.name || 'You'}
      plannerUserId={plannerData.id}
      plannerName={plannerData.name || 'Wedding Planner'}
      companyName={clientData.companies.name}
    />
  )
}
