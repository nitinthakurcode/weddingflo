'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users } from 'lucide-react';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useTranslations } from 'next-intl';

export default function GuestsPage() {
  const t = useTranslations('guests');
  const tc = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();

  // Get current user via tRPC
  const { data: currentUser, isLoading: isLoadingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Get clients for the company
  const { data: clients, isLoading: isLoadingClients } = trpc.clients.getAll.useQuery(
    undefined,
    { enabled: !!currentUser?.company_id }
  );

  // If there's exactly one client, redirect to their guests page
  useEffect(() => {
    if (clients && clients.length === 1) {
      router.push(`/dashboard/clients/${clients[0].id}/guests`);
    }
  }, [clients, router]);

  // Loading state
  if (!session?.user || isLoadingUser || isLoadingClients) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage guests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <Users className="w-12 h-12 text-primary" />
        </div>

        {/* Title and Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Guest Management
          </h1>
          <p className="text-lg text-muted-foreground">
            Guest lists are managed per client
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground max-w-md mx-auto">
          To view and manage wedding guests, please select a client from your client list.
          Each client has their own dedicated guest list and RSVP tracking.
        </p>

        {/* Client count info */}
        {clients && clients.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground">
              You have <span className="font-semibold text-foreground">{clients.length}</span> client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4">
          <Button
            size="lg"
            onClick={() => router.push('/dashboard/clients')}
            className="gap-2"
          >
            View Clients
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Helpful tip */}
        <div className="pt-6 border-t max-w-md mx-auto">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> You can also access guest lists directly from the client detail page:
            Dashboard → Clients → [Select Client] → Guests
          </p>
        </div>
      </div>
    </div>
  );
}
