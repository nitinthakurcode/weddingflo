/**
 * Firebase Client Configuration
 *
 * Initializes Firebase app for client-side push notifications
 * Uses singleton pattern to prevent multiple initializations
 *
 * @see https://firebase.google.com/docs/cloud-messaging/js/client
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// Firebase configuration interface for type safety
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Validate Firebase configuration
function validateFirebaseConfig(): FirebaseConfig {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Validate all required fields are present
  const missingFields = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingFields.join(', ')}. ` +
      `Please check your environment variables.`
    );
  }

  return config as FirebaseConfig;
}

// Initialize Firebase app (singleton pattern)
let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  try {
    const config = validateFirebaseConfig();
    firebaseApp = initializeApp(config);
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Get messaging instance with browser support check
let messagingInstance: Messaging | null = null;
let messagingSupportChecked = false;
let isMessagingSupported = false;

/**
 * Get Firebase Messaging instance
 * Returns null if messaging is not supported in current browser
 * Caches the support check to avoid repeated async calls
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  // Return cached instance if available
  if (messagingInstance) {
    return messagingInstance;
  }

  // Return null if we already know messaging is not supported
  if (messagingSupportChecked && !isMessagingSupported) {
    return null;
  }

  try {
    // Check if messaging is supported in this browser
    if (!messagingSupportChecked) {
      isMessagingSupported = await isSupported();
      messagingSupportChecked = true;
    }

    if (!isMessagingSupported) {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }

    // Get or initialize Firebase app
    const app = getFirebaseApp();

    // Initialize messaging
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('Failed to get Firebase Messaging instance:', error);
    return null;
  }
}

/**
 * Check if push notifications are supported in the current environment
 * Useful for showing/hiding notification UI elements
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if Notification API is available
  if (!('Notification' in window)) {
    return false;
  }

  // Check if Service Worker is supported
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  // Check if Firebase Messaging is supported
  const messaging = await getMessagingInstance();
  return messaging !== null;
}

// Export the app for use in other modules
export { firebaseApp };
