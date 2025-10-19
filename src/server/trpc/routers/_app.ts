import { router } from '../trpc';
import { clientsRouter } from './clients';

/**
 * Application Router
 *
 * This is the main tRPC router that combines all domain routers.
 * Add new feature routers here as you create them.
 *
 * @example
 * ```ts
 * export const appRouter = router({
 *   clients: clientsRouter,
 *   vendors: vendorsRouter,
 *   tasks: tasksRouter,
 * });
 * ```
 */
export const appRouter = router({
  clients: clientsRouter,
});

/**
 * Type definition for the app router.
 * This type enables end-to-end type safety from server to client.
 *
 * @example
 * ```ts
 * import type { AppRouter } from '@/server/trpc/routers/_app';
 *
 * const trpc = createTRPCReact<AppRouter>();
 * ```
 */
export type AppRouter = typeof appRouter;
