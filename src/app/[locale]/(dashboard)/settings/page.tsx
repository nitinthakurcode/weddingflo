import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function SettingsPage() {
  // Get locale from headers for proper redirects
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const localeMatch = url.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Redirect to profile page as default
  redirect(`/${locale}/settings/profile`);
}
