/**
 * Activity Logging System
 * December 2025 - tRPC Implementation (no Supabase)
 * Logs user actions for audit trail
 */

import { trpc } from '@/lib/trpc/client';

export type EntityType =
  | 'user'
  | 'company'
  | 'client'
  | 'guest'
  | 'vendor'
  | 'budget'
  | 'creative'
  | 'message'
  | 'event'
  | 'hotel'
  | 'gift'
  | 'settings';

export type Action =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'exported'
  | 'imported'
  | 'checked_in'
  | 'sent'
  | 'uploaded'
  | 'downloaded';

export interface ActivityLogData {
  action: Action;
  entityType: EntityType;
  entityId: string;
  changes?: any;
  previousValue?: any;
  newValue?: any;
  clientId?: string;
}

/**
 * Hook to log activity via tRPC
 */
export function useLogActivity() {
  const utils = trpc.useUtils();
  const recordActivity = trpc.activity.recordActivity.useMutation({
    onSuccess: () => {
      utils.activity.getFeed.invalidate();
    },
  });

  return async (data: ActivityLogData) => {
    try {
      // Get browser info
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : undefined;
      const deviceType = getDeviceType(userAgent);

      await recordActivity.mutateAsync({
        clientId: data.clientId,
        activityType: `${data.entityType}_${data.action}`,
        title: `${data.action.charAt(0).toUpperCase() + data.action.slice(1)} ${data.entityType}`,
        description: data.changes ? JSON.stringify(data.changes) : undefined,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: {
          action: data.action,
          previousValue: data.previousValue,
          newValue: data.newValue,
          changes: data.changes,
          userAgent,
          deviceType,
        },
      });
    } catch (error) {
      console.error('[Activity Log] Failed to log activity:', error);
    }
  };
}

/**
 * Helper function to determine device type from user agent
 */
function getDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';

  if (/mobile/i.test(userAgent)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Activity log action helpers
 */
export const ActivityActions = {
  /**
   * Log entity creation
   */
  created: (
    entityType: EntityType,
    entityId: string,
    data?: any,
    clientId?: string
  ): ActivityLogData => ({
    action: 'created',
    entityType,
    entityId,
    newValue: data,
    clientId,
  }),

  /**
   * Log entity update
   */
  updated: (
    entityType: EntityType,
    entityId: string,
    previousValue?: any,
    newValue?: any,
    clientId?: string
  ): ActivityLogData => ({
    action: 'updated',
    entityType,
    entityId,
    previousValue,
    newValue,
    changes: getChanges(previousValue, newValue),
    clientId,
  }),

  /**
   * Log entity deletion
   */
  deleted: (
    entityType: EntityType,
    entityId: string,
    data?: any,
    clientId?: string
  ): ActivityLogData => ({
    action: 'deleted',
    entityType,
    entityId,
    previousValue: data,
    clientId,
  }),

  /**
   * Log entity view
   */
  viewed: (
    entityType: EntityType,
    entityId: string,
    clientId?: string
  ): ActivityLogData => ({
    action: 'viewed',
    entityType,
    entityId,
    clientId,
  }),

  /**
   * Log export
   */
  exported: (
    entityType: EntityType,
    format: string,
    count?: number,
    clientId?: string
  ): ActivityLogData => ({
    action: 'exported',
    entityType,
    entityId: `export-${Date.now()}`,
    newValue: { format, count },
    clientId,
  }),

  /**
   * Log import
   */
  imported: (
    entityType: EntityType,
    count: number,
    source?: string,
    clientId?: string
  ): ActivityLogData => ({
    action: 'imported',
    entityType,
    entityId: `import-${Date.now()}`,
    newValue: { count, source },
    clientId,
  }),

  /**
   * Log check-in
   */
  checkedIn: (
    guestId: string,
    method: 'manual' | 'qr',
    clientId?: string
  ): ActivityLogData => ({
    action: 'checked_in',
    entityType: 'guest',
    entityId: guestId,
    newValue: { method },
    clientId,
  }),
};

/**
 * Compare objects and return changes
 */
function getChanges(oldValue: any, newValue: any): Record<string, any> | undefined {
  if (!oldValue || !newValue) return undefined;

  const changes: Record<string, any> = {};

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldValue),
    ...Object.keys(newValue),
  ]);

  allKeys.forEach((key) => {
    const old = oldValue[key];
    const newVal = newValue[key];

    if (JSON.stringify(old) !== JSON.stringify(newVal)) {
      changes[key] = {
        from: old,
        to: newVal,
      };
    }
  });

  return Object.keys(changes).length > 0 ? changes : undefined;
}
