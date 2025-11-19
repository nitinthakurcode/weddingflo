'use client';

import { useEffect } from 'react';
import { offlineQueue } from '@/lib/offline/queue-manager';

export function OfflineInit() {
  useEffect(() => {
    offlineQueue.init();
  }, []);

  return null;
}
