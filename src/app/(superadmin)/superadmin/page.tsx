import { redirect } from 'next/navigation';

// Redirect /superadmin to /superadmin/dashboard
// The actual dashboard implementation is at /superadmin/dashboard
export default function SuperAdminRoot() {
  redirect('/superadmin/dashboard');
}
