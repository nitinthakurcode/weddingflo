import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * BetterAuth Catch-All Handler
 *
 * Handles all BetterAuth API routes including:
 * - /api/auth/sign-in/*
 * - /api/auth/sign-out
 * - /api/auth/sign-up/*
 * - /api/auth/session
 * - /api/auth/callback/*
 * - etc.
 */
export const { GET, POST } = toNextJsHandler(auth);
