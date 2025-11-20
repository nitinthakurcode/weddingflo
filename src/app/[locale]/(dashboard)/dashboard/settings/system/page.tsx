'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Shield,
  Key,
  Settings,
  Clock
} from 'lucide-react'

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'warning'
  message: string
  latency?: number
  details?: Record<string, any>
}

interface HealthReport {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  checks: HealthCheck[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
    warnings: number
  }
}

export default function SystemStatusPage() {
  const [healthData, setHealthData] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/health/detailed')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setHealthData(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getCheckIcon = (name: string) => {
    if (name.includes('Supabase') || name.includes('RLS')) {
      return <Database className="w-5 h-5" />
    }
    if (name.includes('Clerk') || name.includes('Auth')) {
      return <Shield className="w-5 h-5" />
    }
    if (name.includes('JWT') || name.includes('Claims')) {
      return <Key className="w-5 h-5" />
    }
    return <Settings className="w-5 h-5" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground">
            Monitor integration health and system status
          </p>
        </div>
        <Button onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      {healthData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Overall System Health</CardTitle>
              {getStatusBadge(healthData.overall)}
            </div>
            <CardDescription>
              {healthData.summary.healthy}/{healthData.summary.total} checks passing
              {lastRefresh && (
                <span className="ml-2 flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  Last checked: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {healthData.summary.healthy}
                </div>
                <div className="text-sm text-green-800">Healthy</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {healthData.summary.warnings}
                </div>
                <div className="text-sm text-yellow-800">Warnings</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {healthData.summary.unhealthy}
                </div>
                <div className="text-sm text-red-800">Unhealthy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span>Failed to fetch system status: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Checks */}
      {healthData && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Integration Checks</h2>
          <div className="grid gap-4">
            {healthData.checks.map((check, index) => (
              <Card key={index} className={
                check.status === 'unhealthy' ? 'border-red-200' :
                check.status === 'warning' ? 'border-yellow-200' :
                'border-green-200'
              }>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground">
                        {getCheckIcon(check.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{check.name}</h3>
                          {getStatusIcon(check.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {check.message}
                        </p>
                        {check.latency !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Response time: {check.latency}ms
                          </p>
                        )}
                        {check.details && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
          <CardDescription>
            Common issues and how to resolve them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">JWT Claims Missing</h4>
            <p className="text-sm text-muted-foreground">
              If role or company_id is missing, check your Clerk session token customization.
              The token should include: {`{"metadata":{"role":"{{user.public_metadata.role}}","company_id":"{{user.public_metadata.company_id}}"}}`}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">RLS Policy Errors</h4>
            <p className="text-sm text-muted-foreground">
              Ensure the Supabase RLS helper functions (get_user_role, get_user_company_id)
              read from the correct JWT claim path. For native integration, use "metadata" not "publicMetadata".
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Build Cache Errors</h4>
            <p className="text-sm text-muted-foreground">
              If you see "Cannot find module" errors during development, run:{' '}
              <code className="bg-muted px-1 py-0.5 rounded">rm -rf .next && npm run dev</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
