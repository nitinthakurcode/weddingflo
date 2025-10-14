// WeddingFlow Pro Service Worker
// Uses Workbox for caching strategies

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  console.log('🎉 Workbox is loaded');

  // Force production builds
  workbox.setConfig({ debug: false });

  // Precache static assets
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Cache-first strategy for images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Network-first strategy for API calls with timeout
  workbox.routing.registerRoute(
    ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

  // Stale-while-revalidate for CSS and JS
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Cache fonts with Cache-first strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    })
  );

  // Network-first for Convex API calls
  workbox.routing.registerRoute(
    ({ url }) => url.hostname.includes('convex.cloud'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'convex-api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

  // Network-first for Clerk authentication
  workbox.routing.registerRoute(
    ({ url }) => url.hostname.includes('clerk'),
    new workbox.strategies.NetworkOnly()
  );

  // Cache HTML pages with network-first strategy
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Offline fallback page
  const OFFLINE_URL = '/offline';
  const OFFLINE_CACHE_NAME = 'offline-page';

  // Cache the offline page during install
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(OFFLINE_CACHE_NAME).then((cache) => {
        // You can create an /offline page to show when user is offline
        // return cache.add(OFFLINE_URL);
        console.log('✅ Service worker installed');
      })
    );
    self.skipWaiting();
  });

  // Activate handler
  self.addEventListener('activate', (event) => {
    console.log('✅ Service worker activated');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return (
                cacheName.startsWith('workbox-') ||
                cacheName.startsWith('images-') ||
                cacheName.startsWith('api-') ||
                cacheName.startsWith('static-') ||
                cacheName.startsWith('fonts-')
              );
            })
            .map((cacheName) => {
              if (
                !cacheName.includes('v1') &&
                (cacheName.startsWith('workbox-') ||
                  cacheName.startsWith('images-') ||
                  cacheName.startsWith('api-') ||
                  cacheName.startsWith('static-') ||
                  cacheName.startsWith('fonts-'))
              ) {
                return caches.delete(cacheName);
              }
            })
        );
      })
    );
    self.clients.claim();
  });

  // Background sync for offline actions
  if ('sync' in self.registration) {
    self.addEventListener('sync', (event) => {
      console.log('🔄 Background sync triggered:', event.tag);

      if (event.tag === 'sync-offline-actions') {
        event.waitUntil(syncOfflineActions());
      }
    });
  }

  // Periodic background sync (requires user permission)
  if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
      console.log('🔄 Periodic sync triggered:', event.tag);

      if (event.tag === 'sync-data') {
        event.waitUntil(syncDataInBackground());
      }
    });
  }

  // Message handler for communication with the app
  self.addEventListener('message', (event) => {
    console.log('📨 SW received message:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
      const urlsToCache = event.data.payload;
      event.waitUntil(
        caches.open('runtime-cache').then((cache) => cache.addAll(urlsToCache))
      );
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
      );
    }
  });

  // Sync offline actions
  async function syncOfflineActions() {
    try {
      // Open IndexedDB and get offline actions
      const db = await openIndexedDB();
      const actions = await getOfflineActions(db);

      console.log('📤 Syncing offline actions:', actions.length);

      // Process each action
      for (const action of actions) {
        try {
          // Send action to server
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: action.headers,
            body: JSON.stringify(action.data),
          });

          if (response.ok) {
            // Remove action from queue
            await removeOfflineAction(db, action.id);
            console.log('✅ Synced action:', action.id);
          }
        } catch (error) {
          console.error('❌ Failed to sync action:', action.id, error);
        }
      }

      // Notify clients about sync completion
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          payload: { synced: actions.length },
        });
      });
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  // Sync data in background
  async function syncDataInBackground() {
    console.log('🔄 Background data sync...');
    // Implement periodic data refresh here
  }

  // IndexedDB helpers (basic implementation)
  function openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WeddingFlowDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offlineActions')) {
          db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  function getOfflineActions(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offlineActions', 'readonly');
      const store = transaction.objectStore('offlineActions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function removeOfflineAction(db, id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offlineActions', 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

} else {
  console.error('❌ Workbox failed to load');
}

// Log service worker version
console.log('🚀 WeddingFlow Pro Service Worker v1.0.0');
