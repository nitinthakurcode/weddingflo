'use client';

import { useEffect, useCallback } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { useDebounce } from './use-debounce';
import { useLocalStorage } from './use-local-storage';

interface UseFormAutosaveOptions<T extends Record<string, any>> {
  watch: UseFormWatch<T>;
  storageKey: string;
  debounceMs?: number;
  onSave?: (data: T) => void;
  enabled?: boolean;
}

/**
 * Hook to auto-save form data to localStorage
 * @param options - configuration options
 * @returns { clearSaved, hasSavedData }
 */
export function useFormAutosave<T extends Record<string, any>>({
  watch,
  storageKey,
  debounceMs = 1000,
  onSave,
  enabled = true,
}: UseFormAutosaveOptions<T>) {
  const [savedData, setSavedData, clearSavedData] = useLocalStorage<T | null>(
    storageKey,
    null
  );

  // Watch all form values
  const formValues = watch();

  // Debounce the form values
  const debouncedFormValues = useDebounce(formValues, debounceMs);

  // Save to localStorage when debounced values change
  useEffect(() => {
    if (!enabled) return;

    // Don't save if form is empty
    const hasValues = Object.values(debouncedFormValues).some(
      (value) => value !== '' && value !== null && value !== undefined
    );

    if (hasValues) {
      setSavedData(debouncedFormValues);
      onSave?.(debouncedFormValues);
    }
  }, [debouncedFormValues, enabled, onSave, setSavedData]);

  const clearSaved = useCallback(() => {
    clearSavedData();
  }, [clearSavedData]);

  const hasSavedData = savedData !== null && Object.keys(savedData).length > 0;

  return {
    clearSaved,
    hasSavedData,
    savedData,
  };
}
