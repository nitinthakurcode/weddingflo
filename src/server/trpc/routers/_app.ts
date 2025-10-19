import { router } from '../trpc';
import { clientsRouter } from './clients';
import { messagesRouter } from './messages';
import { usersRouter } from './users';
import { guestsRouter } from './guests';
import { hotelsRouter } from './hotels';
import { giftsRouter } from './gifts';
import { vendorsRouter } from './vendors';
import { budgetRouter } from './budget';
import { eventsRouter } from './events';
import { timelineRouter } from './timeline';
import { documentsRouter } from './documents';
import { creativesRouter } from './creatives';

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
  messages: messagesRouter,
  users: usersRouter,
  guests: guestsRouter,
  hotels: hotelsRouter,
  gifts: giftsRouter,
  vendors: vendorsRouter,
  budget: budgetRouter,
  events: eventsRouter,
  timeline: timelineRouter,
  documents: documentsRouter,
  creatives: creativesRouter,
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
