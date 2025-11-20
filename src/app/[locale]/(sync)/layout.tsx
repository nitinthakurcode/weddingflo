import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';

/**
 * Sync Layout
 *
 * This layout only requires authentication (userId), not role.
 * Used for the sync page that helps users without metadata.
 */
export default async function SyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  // Get locale from headers
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const localeMatch = url.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Must be authenticated to access sync
  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  // Check both paths for compatibility
  const metadata = sessionClaims?.metadata as { role?: string; company_id?: string } | undefined;
  const publicMetadata = (sessionClaims as any)?.publicMetadata as { role?: string; company_id?: string } | undefined;

  const role = metadata?.role || publicMetadata?.role as string | undefined;
  const companyId = metadata?.company_id || publicMetadata?.company_id as string | undefined;

  console.log('[Sync Layout] Session claims:', { role, companyId });

  if (role && companyId) {
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
