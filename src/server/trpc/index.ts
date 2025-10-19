/**
 * tRPC Server Exports
 *
 * This file provides a single entry point for all tRPC server-side exports.
 * Import from here instead of individual files for consistency.
 *
 * @example
 * ```ts
 * import { appRouter, createTRPCContext } from '@/server/trpc';
 * import type { AppRouter } from '@/server/trpc';
 * ```
 */

export { appRouter } from './routers/_app';
export { createTRPCContext } from './context';
export { router, publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure } from './trpc';

export type { AppRouter } from './routers/_app';
export type { Context } from './context';
