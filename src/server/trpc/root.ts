/**
 * @deprecated This file is kept as backup only.
 * Use routers/_app.ts instead (standard tRPC convention).
 *
 * Migration completed: Session 21 - 2025-01-19
 * This file can be safely deleted once _app.ts is verified working.
 */

import { router } from './trpc';
import { clientsRouter } from './routers/clients';

/**
 * Root tRPC router (DEPRECATED - Use routers/_app.ts)
 *
 * This is the main router that combines all feature routers.
 * Add new routers here as you create them.
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
 * Used on the client side for type-safe tRPC calls.
 *
 * @example
 * ```ts
 * import type { AppRouter } from '@/server/trpc/root';
 *
 * const trpc = createTRPCReact<AppRouter>();
 * ```
 */
export type AppRouter = typeof appRouter;
