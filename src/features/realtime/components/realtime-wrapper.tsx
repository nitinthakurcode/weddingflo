'use client'

/**
 * RealtimeWrapper Component
 *
 * February 2026 - Client component wrapper for real-time sync
 *
 * This component wraps the RealtimeProvider for use in server components.
 * Since dashboard layout is a server component, we need this client wrapper.
 */

import { ReactNode } from 'react'
import { RealtimeProvider } from './realtime-provider'

interface RealtimeWrapperProps {
  children: ReactNode
}

export function RealtimeWrapper({ children }: RealtimeWrapperProps) {
  return <RealtimeProvider>{children}</RealtimeProvider>
}
