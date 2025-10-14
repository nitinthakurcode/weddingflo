'use client';

import { useState } from 'react';

interface UseClipboardOptions {
  timeout?: number; // Reset copied state after timeout (default: 2000ms)
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to copy text to clipboard
 * @param options - configuration options
 * @returns { copied, copy, error }
 */
export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = async (text: string) => {
    if (!navigator?.clipboard) {
      const err = new Error('Clipboard API not supported');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      onSuccess?.();

      // Reset copied state after timeout
      setTimeout(() => {
        setCopied(false);
      }, timeout);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');
      setError(error);
      onError?.(error);
    }
  };

  return { copied, copy, error };
}
