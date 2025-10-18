// Run this in your browser DevTools Console (only needed once for dev cleanup)
// This clears service workers and cache that might cause ChunkLoadError

(async () => {
  console.log('🧹 Clearing browser cache and service workers...');
  
  // 1. Unregister service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Unregistered service worker:', registration.scope);
    }
  }
  
  // 2. Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('✅ Deleted cache:', cacheName);
    }
  }
  
  console.log('✅ Done! Now reload the page: location.reload()');
  
  // Optional: Auto-reload after 2 seconds
  setTimeout(() => {
    console.log('🔄 Reloading page...');
    location.reload();
  }, 2000);
})();
