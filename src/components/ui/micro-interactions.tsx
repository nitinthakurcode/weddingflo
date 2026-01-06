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
