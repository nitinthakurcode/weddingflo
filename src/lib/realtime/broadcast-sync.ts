import { publishSyncAction, storeSyncAction } from '@/lib/realtime/redis-pubsub'
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
    await Promise.all([
      publishSyncAction(syncAction),
      storeSyncAction(syncAction),
    ])
  } catch (error) {
    // Log but don't throw — sync failure shouldn't block the mutation
    console.error('[broadcastSync] Failed:', error)
  }
}
