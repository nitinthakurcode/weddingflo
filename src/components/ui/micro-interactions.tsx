'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Micro-interactions for delightful UI feedback
 */

interface LoadingShimmerProps {
  className?: string;
  children?: ReactNode;
}

export function LoadingShimmer({ className, children }: LoadingShimmerProps) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)}>
      {children}
    </div>
  );
}

interface SlideUpItemProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SlideUpItem({ children, className, delay = 0 }: SlideUpItemProps) {
  return (
    <div
      className={cn('animate-fade-in-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function ScaleOnHover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('transition-transform hover:scale-105', className)}>
      {children}
    </div>
  );
}

export function PressEffect({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('transition-transform active:scale-95', className)}>
      {children}
    </div>
  );
}

interface PulsingDotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'warning' | 'error';
}

export function PulsingDot({ className, size = 'md', color = 'default' }: PulsingDotProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const colorClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <span className={cn('relative flex', sizeClasses[size], className)}>
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
          colorClasses[color]
        )}
      />
      <span
        className={cn(
          'relative inline-flex h-full w-full rounded-full',
          colorClasses[color]
        )}
      />
    </span>
  );
}
