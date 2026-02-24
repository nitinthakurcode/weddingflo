import { storeSyncAction } from '@/lib/realtime/redis-pubsub'
import type { SyncAction } from '@/lib/realtime/redis-pubsub'
import { randomUUID } from 'crypto'

interface BroadcastSyncParams {
  type: 'insert' | 'update' | 'delete'
  module: SyncAction['module']
  entityId: string
  companyId: string
  clientId?: string
  userId: string
  data?: Record<string, unknown>
  queryPaths: string[]
}

export async function broadcastSync(params: BroadcastSyncParams) {
  const syncAction: SyncAction = {
    id: randomUUID(),
    type: params.type,
    module: params.module,
    entityId: params.entityId,
    companyId: params.companyId,
    clientId: params.clientId,
    userId: params.userId,
    data: params.data,
    timestamp: Date.now(),
    queryPaths: params.queryPaths,
  }

  try {
    // storeSyncAction writes to Redis sorted set — the actual delivery mechanism.
    // publishSyncAction (Redis PUBLISH) was removed: Upstash REST API does not support
    // persistent subscriptions, so subscribeToCompany() polls the sorted set instead.
    await storeSyncAction(syncAction)
  } catch (error) {
    // Log but don't throw — sync failure shouldn't block the mutation
    console.error('[broadcastSync] Failed:', error)
  }
}
