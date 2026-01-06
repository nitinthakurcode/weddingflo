'use client';

import { ReactNode } from 'react';

/**
 * Feedback Provider
 *
 * Provides feedback/notification context for the application.
 * Currently a placeholder - can be extended for toast notifications,
 * user feedback collection, etc.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
