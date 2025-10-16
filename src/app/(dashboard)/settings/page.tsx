import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to profile page as default
  redirect('/settings/profile');
}
