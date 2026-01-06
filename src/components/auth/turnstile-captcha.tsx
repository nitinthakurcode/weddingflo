'use client';

import { useEffect, useRef } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA Component
 *
 * Only renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured.
 * Provides bot protection for auth forms.
 */
export function TurnstileCaptcha({
  onVerify,
  onExpire,
  onError,
  className,
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    // Load Turnstile script if not already loaded
    const scriptId = 'turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait for Turnstile to be ready
    const initWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
        });
      }
    };

    // Check if already loaded
    if (window.turnstile) {
      initWidget();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          initWidget();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  // Don't render anything if CAPTCHA is not enabled
  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

/**
 * Check if CAPTCHA is enabled
 */
export function isCaptchaEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

// Extend Window interface for Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}
