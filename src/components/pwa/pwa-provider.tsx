'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker-register';
import { initializeDB } from '@/lib/offline/indexed-db';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { useToast } from '@/hooks/use-toast';

/**
 * PWA Provider
 * Handles service worker registration and PWA initialization
 */
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    // Only in browser environment
    if (typeof window === 'undefined') return;

    // Initialize PWA features
    initializePWA();

    // Listen for SW notifications
    window.addEventListener('sw-notification', ((event: CustomEvent) => {
      toast({
        title: event.detail.type === 'success' ? 'Success' : event.detail.type === 'error' ? 'Error' : 'Info',
        description: event.detail.message,
        variant: event.detail.type === 'error' || event.detail.type === 'warning' ? 'destructive' : 'default',
      });
    }) as EventListener);

    return () => {
      window.removeEventListener('sw-notification', (() => {}) as any);
    };
  }, [toast]);

  async function initializePWA() {
    try {
      // Initialize IndexedDB
      await initializeDB();
      console.log('✅ IndexedDB initialized');

      // TEMPORARILY DISABLED - Service Worker causing cache issues
      console.warn('⚠️ Service Worker DISABLED for development');
      return;

      // Register service worker
      const registration = await registerServiceWorker({
        onInstalled: () => {
          console.log('✅ Service Worker installed');
          toast({
            title: 'App ready',
            description: 'The app is now available offline!',
          });
        },
        onUpdated: () => {
          console.log('✅ Service Worker updated');
          toast({
            title: 'Update available',
            description: 'A new version is available. Refresh to update.',
          });
        },
        onOffline: () => {
          console.log('📴 App is offline');
        },
        onOnline: () => {
          console.log('🌐 App is back online');
        },
        onError: (error) => {
          console.error('❌ Service Worker error:', error);
        },
      });

      if (registration) {
        console.log('✅ PWA initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize PWA:', error);
    }
  }

  return (
    <>
      {children}
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}
