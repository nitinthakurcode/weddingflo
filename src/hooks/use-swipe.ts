'use client';

import { useCallback, useRef, useState } from 'react';

interface SwipeState {
  startX: number;
  currentX: number;
  swiping: boolean;
  swipePercentage: number;
}

interface UseSwipeToConfirmOptions {
  threshold?: number; // Percentage threshold to trigger confirm (default: 80)
  onConfirm?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface UseSwipeToConfirmReturn {
  swipeState: SwipeState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  isConfirmed: boolean;
  reset: () => void;
}

/**
 * Hook for swipe-to-confirm interactions
 *
 * Provides touch and mouse handlers for swipe gestures
 * that trigger a confirmation action when threshold is reached.
 */
export function useSwipeToConfirm(
  options: UseSwipeToConfirmOptions = {}
): UseSwipeToConfirmReturn {
  const { threshold = 80, onConfirm, onCancel, disabled = false } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    swiping: false,
    swipePercentage: 0,
  });

  const getPercentage = useCallback(
    (startX: number, currentX: number, containerWidth: number): number => {
      const delta = currentX - startX;
      const percentage = Math.min(100, Math.max(0, (delta / containerWidth) * 100));
      return percentage;
    },
    []
  );

  const handleStart = useCallback(
    (clientX: number) => {
      if (disabled || isConfirmed) return;
      setSwipeState({
        startX: clientX,
        currentX: clientX,
        swiping: true,
        swipePercentage: 0,
      });
    },
    [disabled, isConfirmed]
  );

  const handleMove = useCallback(
    (clientX: number, containerWidth: number) => {
      if (!swipeState.swiping || disabled) return;

      const percentage = getPercentage(swipeState.startX, clientX, containerWidth);
      setSwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        swipePercentage: percentage,
      }));
    },
    [swipeState.swiping, swipeState.startX, disabled, getPercentage]
  );

  const handleEnd = useCallback(() => {
    if (!swipeState.swiping) return;

    if (swipeState.swipePercentage >= threshold) {
      setIsConfirmed(true);
      onConfirm?.();
    } else {
      onCancel?.();
    }

    setSwipeState({
      startX: 0,
      currentX: 0,
      swiping: false,
      swipePercentage: 0,
    });
  }, [swipeState.swiping, swipeState.swipePercentage, threshold, onConfirm, onCancel]);

  const reset = useCallback(() => {
    setIsConfirmed(false);
    setSwipeState({
      startX: 0,
      currentX: 0,
      swiping: false,
      swipePercentage: 0,
    });
  }, []);

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      handleStart(e.touches[0].clientX);
    },
    onTouchMove: (e: React.TouchEvent) => {
      const target = e.currentTarget as HTMLElement;
      handleMove(e.touches[0].clientX, target.offsetWidth);
    },
    onTouchEnd: () => {
      handleEnd();
    },
    onMouseDown: (e: React.MouseEvent) => {
      handleStart(e.clientX);
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!swipeState.swiping) return;
      const target = e.currentTarget as HTMLElement;
      handleMove(e.clientX, target.offsetWidth);
    },
    onMouseUp: () => {
      handleEnd();
    },
    onMouseLeave: () => {
      if (swipeState.swiping) {
        handleEnd();
      }
    },
  };

  return {
    swipeState,
    handlers,
    isConfirmed,
    reset,
  };
}

/**
 * Simple swipe direction detection hook
 */
export function useSwipeDirection(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}) {
  const { threshold = 50 } = options;
  const startPos = useRef({ x: 0, y: 0 });

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      startPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startPos.current.x;
      const deltaY = endY - startPos.current.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold) {
          options.onSwipeRight?.();
        } else if (deltaX < -threshold) {
          options.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold) {
          options.onSwipeDown?.();
        } else if (deltaY < -threshold) {
          options.onSwipeUp?.();
        }
      }
    },
  };

  return handlers;
}
