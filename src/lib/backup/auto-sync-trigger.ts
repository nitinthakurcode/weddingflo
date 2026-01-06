/**
 * Auto Sync Trigger - Stub
 *
 * Triggers batch sync operations for backup.
 * TODO: Implement full functionality
 */

export type EntityType = 'guests' | 'vendors' | 'budget' | 'gifts' | 'hotels' | 'transport' | 'guestGifts';

export async function triggerBatchSync(entityType: EntityType, ids: string[]) {
  console.warn(`Backup sync not configured - triggerBatchSync stub for ${entityType}`);
  return { success: true, synced: ids.length };
}

export async function triggerFullSync(clientId: string) {
  console.warn('Backup sync not configured - triggerFullSync stub');
  return { success: true };
}
