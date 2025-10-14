'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * PWA Install Prompt
 * Shows install button when PWA is installable
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('📱 PWA install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Show prompt after a delay (better UX)
      setTimeout(() => {
        if (!hasUserDismissedPrompt()) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    // Show install prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const choiceResult = await deferredPrompt.userChoice;
    console.log('User choice:', choiceResult.outcome);

    if (choiceResult.outcome === 'accepted') {
      console.log('✅ User accepted install');
      setShowPrompt(false);
      saveUserAcceptedPrompt();
    } else {
      console.log('❌ User dismissed install');
      setShowPrompt(false);
      saveUserDismissedPrompt();
    }

    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    saveUserDismissedPrompt();
  }

  // LocalStorage helpers
  function hasUserDismissedPrompt(): boolean {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return false;

    const dismissedTime = parseInt(dismissed, 10);
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    return daysSinceDismiss < 7;
  }

  function saveUserDismissedPrompt() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  }

  function saveUserAcceptedPrompt() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-accepted', Date.now().toString());
    }
  }

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if not installable or user dismissed
  if (!isInstallable || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom duration-300">
      <Alert className="bg-primary text-primary-foreground border-0 shadow-lg">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 mt-0.5" />
          <div className="flex-1 space-y-2">
            <AlertDescription>
              <strong className="block mb-1">Install WeddingFlow Pro</strong>
              <span className="text-sm opacity-90">
                Install our app for quick access, offline support, and a better experience!
              </span>
            </AlertDescription>
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                variant="secondary"
                className="flex-1"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="hover:bg-primary-foreground/10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Install Button for Header/Navbar
 */
export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
  }

  if (isInstalled) {
    return null;
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Button onClick={handleInstall} size="sm" variant="outline">
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
}

/**
 * Installation Status Card
 */
export function InstallStatusCard() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDate, setInstallDate] = useState<Date | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('pwa-install-accepted');
      if (accepted) {
        setInstallDate(new Date(parseInt(accepted, 10)));
      }
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Installation</CardTitle>
        <CardDescription>
          Progressive Web App installation status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isInstalled ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Installed</div>
                <div className="text-sm text-muted-foreground">
                  App is running in standalone mode
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">Not Installed</div>
                <div className="text-sm text-muted-foreground">
                  Running in browser mode
                </div>
              </div>
            </>
          )}
        </div>

        {isInstalled && installDate && (
          <div className="text-sm text-muted-foreground">
            Installed on {installDate.toLocaleDateString()}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Benefits of Installing:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Quick access from home screen
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Faster performance
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Native app-like experience
            </li>
          </ul>
        </div>

        {!isInstalled && <InstallButton />}
      </CardContent>
    </Card>
  );
}
