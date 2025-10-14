/**
 * Offline Queue Manager
 * Queues actions while offline and syncs when back online
 */

import { getDB, OfflineAction } from './indexed-db';

/**
 * Add action to offline queue
 */
export async function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<number> {
  const db = await getDB();

  const fullAction: Omit<OfflineAction, 'id'> = {
    ...action,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  const id = await db.add('offlineQueue', fullAction as OfflineAction);
  console.log('📝 Action queued:', id, fullAction.type);

  return id as number;
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await getDB();
  const actions = await db.getAllFromIndex('offlineQueue', 'by-status', 'pending');
  return actions.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get all actions (including syncing and failed)
 */
export async function getAllActions(): Promise<OfflineAction[]> {
  const db = await getDB();
  return await db.getAll('offlineQueue');
}

/**
 * Update action status
 */
export async function updateActionStatus(
  id: number,
  status: 'pending' | 'syncing' | 'failed',
  lastError?: string
): Promise<void> {
  const db = await getDB();
  const action = await db.get('offlineQueue', id);

  if (action) {
    action.status = status;
    if (lastError) {
      action.lastError = lastError;
    }
    if (status === 'failed') {
      action.retryCount += 1;
    }
    await db.put('offlineQueue', action);
    console.log('📝 Action status updated:', id, status);
  }
}

/**
 * Remove action from queue
 */
export async function removeAction(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('offlineQueue', id);
  console.log('🗑️ Action removed from queue:', id);
}

/**
 * Clear all pending actions
 */
export async function clearPendingActions(): Promise<void> {
  const db = await getDB();
  const actions = await getPendingActions();

  for (const action of actions) {
    if (action.id) {
      await db.delete('offlineQueue', action.id);
    }
  }

  console.log('🗑️ All pending actions cleared');
}

/**
 * Get action count by status
 */
export async function getActionCountByStatus(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
}> {
  const db = await getDB();

  const [pending, syncing, failed] = await Promise.all([
    db.countFromIndex('offlineQueue', 'by-status', 'pending'),
    db.countFromIndex('offlineQueue', 'by-status', 'syncing'),
    db.countFromIndex('offlineQueue', 'by-status', 'failed'),
  ]);

  return { pending, syncing, failed };
}

/**
 * Get actions by type
 */
export async function getActionsByType(type: OfflineAction['type']): Promise<OfflineAction[]> {
  const db = await getDB();
  return await db.getAllFromIndex('offlineQueue', 'by-type', type);
}

/**
 * Retry failed actions
 */
export async function retryFailedActions(): Promise<void> {
  const db = await getDB();
  const failed = await db.getAllFromIndex('offlineQueue', 'by-status', 'failed');

  for (const action of failed) {
    if (action.id && action.retryCount < 3) {
      // Max 3 retries
      action.status = 'pending';
      await db.put('offlineQueue', action);
      console.log('🔄 Retrying action:', action.id);
    } else if (action.id) {
      console.warn('⚠️ Max retries reached for action:', action.id);
    }
  }
}

/**
 * Helper: Queue a guest check-in
 */
export async function queueGuestCheckIn(
  guestId: string,
  token: string,
  location?: { lat: number; lng: number }
): Promise<number> {
  return await queueOfflineAction({
    type: 'check-in',
    endpoint: '/api/qr/check-in',
    method: 'POST',
    data: {
      token,
      location,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper: Queue add guest
 */
export async function queueAddGuest(guestData: any): Promise<number> {
  return await queueOfflineAction({
    type: 'add-guest',
    endpoint: '/api/guests',
    method: 'POST',
    data: guestData,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper: Queue edit guest
 */
export async function queueEditGuest(guestId: string, guestData: any): Promise<number> {
  return await queueOfflineAction({
    type: 'edit-guest',
    endpoint: `/api/guests/${guestId}`,
    method: 'PUT',
    data: guestData,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper: Queue delete guest
 */
export async function queueDeleteGuest(guestId: string): Promise<number> {
  return await queueOfflineAction({
    type: 'delete-guest',
    endpoint: `/api/guests/${guestId}`,
    method: 'DELETE',
    data: {},
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  oldestPending?: Date;
}> {
  const counts = await getActionCountByStatus();
  const pending = await getPendingActions();

  return {
    total: counts.pending + counts.syncing + counts.failed,
    ...counts,
    oldestPending: pending.length > 0 ? new Date(pending[0].timestamp) : undefined,
  };
}
