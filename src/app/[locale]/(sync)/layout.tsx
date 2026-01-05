import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema/auth';

/**
 * Sync Layout
 *
 * This layout only requires authentication (userId), not role.
 * Used for the sync page that helps users without metadata.
 * With BetterAuth, this page helps users complete their profile setup.
 */
export default async function SyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, user } = await getServerSession();

  // Get locale from headers
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const localeMatch = url.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Must be authenticated to access sync
  if (!userId || !user) {
    redirect(`/${locale}/sign-in`);
  }

  // Get role and companyId from BetterAuth user object
  let role = (user as any).role as string | undefined;
  let companyId = (user as any).companyId as string | undefined;

  console.log('[Sync Layout] Session data:', { role, companyId });

  // Check database directly to avoid stale session cache
  if (!role || !companyId) {
    try {
      const [dbUser] = await db
        .select({ role: userTable.role, companyId: userTable.companyId })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (dbUser) {
        role = dbUser.role || undefined;
        companyId = dbUser.companyId || undefined;
        console.log('[Sync Layout] Fresh DB data:', { role, companyId });
      }
    } catch (dbError) {
      console.error('[Sync Layout] DB lookup error:', dbError);
    }
  }

  // If user already has role and company, redirect to dashboard
  if (role && companyId) {
    console.log('[Sync Layout] User has role and company, redirecting to dashboard');
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
