'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleOneTapProps {
  callbackURL?: string;
}

/**
 * Google One Tap Sign-In Component
 *
 * Shows Google's frictionless one-tap sign-in prompt.
 * Only renders if NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured.
 */
export function GoogleOneTap({ callbackURL = '/dashboard' }: GoogleOneTapProps) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script
    const scriptId = 'google-identity-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initOneTap = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            // Send the credential to our API for verification
            const res = await fetch('/api/auth/google-one-tap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                credential: response.credential,
                callbackURL,
              }),
            });

            if (res.ok) {
              router.push(callbackURL);
              router.refresh();
            }
          } catch (error) {
            console.error('Google One Tap error:', error);
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false,
      });

      window.google.accounts.id.prompt();
    };

    // Check if already loaded
    if (window.google?.accounts?.id) {
      initOneTap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initOneTap();
        }
      }, 100);

      // Cleanup after 5 seconds if not loaded
      setTimeout(() => clearInterval(checkInterval), 5000);

      return () => clearInterval(checkInterval);
    }
  }, [clientId, callbackURL, router]);

  // This component doesn't render any visible UI
  // Google One Tap shows its own UI overlay
  return null;
}

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
