/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications when the app is not in focus
 * Must be placed in the public directory to be served at the root path
 *
 * SECURITY NOTE: This file is publicly accessible. Do NOT include sensitive keys here.
 * Firebase config is safe to expose as it's protected by Firebase Security Rules.
 *
 * IMPORTANT: Replace the placeholder values with your actual Firebase config
 * You can find these values in your Firebase Console:
 * https://console.firebase.google.com/ -> Project Settings -> General
 */

// Import Firebase scripts (compat version for service workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ⚠️ REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG ⚠️
// These values are safe to expose publicly (they're client-side config)
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY_HERE',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

/**
 * Handle background messages
 * Called when a notification arrives while the app is in the background
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    badge: payload.notification?.badge || '/icons/badge-72x72.png',
    image: payload.notification?.image,
    tag: payload.data?.tag || 'default',
    requireInteraction: payload.data?.requireInteraction === 'true',
    data: payload.data,
    actions: [],
  };

  // Add notification actions based on type
  if (payload.data?.notification_type === 'payment_alert') {
    notificationOptions.actions = [
      { action: 'view', title: 'View Payment' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (payload.data?.notification_type === 'rsvp_update') {
    notificationOptions.actions = [
      { action: 'view', title: 'View RSVP' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (payload.data?.notification_type === 'event_reminder') {
    notificationOptions.actions = [
      { action: 'view', title: 'View Event' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click events
 * Opens the app or focuses existing window when notification is clicked
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Determine target URL
  let targetUrl = '/dashboard';

  if (event.notification.data) {
    const data = event.notification.data;

    // Use custom URL if provided
    if (data.url) {
      targetUrl = data.url;
    }
    // Or construct URL based on notification type
    else if (data.click_action) {
      targetUrl = data.click_action;
    }
    // Type-specific default URLs
    else if (data.notification_type === 'payment_alert') {
      targetUrl = '/dashboard/payments';
    } else if (data.notification_type === 'rsvp_update') {
      targetUrl = '/dashboard/guests';
    } else if (data.notification_type === 'event_reminder') {
      targetUrl = '/dashboard/events';
    } else if (data.notification_type === 'task_deadline') {
      targetUrl = '/dashboard/timeline';
    } else if (data.notification_type === 'vendor_message') {
      targetUrl = '/dashboard/vendors';
    }
  }

  // Open URL in the app
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }

        // If app is open but on different page, navigate
        if (clientList.length > 0) {
          const client = clientList[0];
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((client) => client.focus());
          }
          return client.focus();
        }

        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * Handle notification close events
 * Track when users dismiss notifications
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);

  // Optional: Send analytics event for dismissed notifications
  // This helps track which notifications users find irrelevant
});

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  self.skipWaiting();
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(clients.claim());
});
