import { offlineQueue } from '@/lib/offline/queue-manager';

export async function offlineSafeMutation<T>(
  mutationFn: () => Promise<T>,
  options: {
    url: string;
    method: string;
    body: any;
  }
): Promise<T> {
  // Try online first
  if (navigator.onLine) {
    try {
      return await mutationFn();
    } catch (error) {
      // If online but request failed, add to queue
      await offlineQueue.addToQueue(
        options.url,
        options.method,
        { 'Content-Type': 'application/json' },
        options.body
      );
      throw error;
    }
  }

  // Offline - add to queue immediately
  await offlineQueue.addToQueue(
    options.url,
    options.method,
    { 'Content-Type': 'application/json' },
    options.body
  );

  throw new Error('Offline - request queued for retry');
}
