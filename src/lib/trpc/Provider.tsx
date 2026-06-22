'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, httpSubscriptionLink, splitLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from './client';
import { getQueryPathsForModule, moduleFromTrpcMutationKey } from '@/lib/realtime/query-paths';
import { invalidateQueryPaths } from '@/lib/realtime/invalidate-query-paths';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    // Holder so the mutation-cache callback can reference the client it belongs
    // to (the cache is constructed before the client).
    const ref: { current: QueryClient | null } = { current: null };

    // Instant, Redis-independent cross-module invalidation for the ACTING tab.
    // Every tRPC mutation carries mutationKey = [[router, procedure]]; we map
    // the router to its cross-module query paths and invalidate them locally,
    // so e.g. creating a vendor immediately refreshes budget views in this tab.
    // Other tabs/users are refreshed by the realtime sync (broadcastSync).
    const mutationCache = new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        if (!ref.current) return;
        const moduleName = moduleFromTrpcMutationKey(mutation.options.mutationKey);
        if (!moduleName) return;
        invalidateQueryPaths(ref.current, getQueryPathsForModule(moduleName));
      },
    });

    const client = new QueryClient({
      mutationCache,
      defaultOptions: {
        queries: {
          // 20s: real-time sync invalidations drive freshness; this just
          // caps how stale data can get if a sync event is missed.
          staleTime: 20000,
        },
      },
    });
    ref.current = client;
    return client;
  });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: httpSubscriptionLink({
            url: '/api/trpc',
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: '/api/trpc',
            transformer: superjson,
          }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
