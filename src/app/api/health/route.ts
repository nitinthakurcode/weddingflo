/**
 * Health Check Endpoint for Fly.io
 *
 * Used by:
 * - Dockerfile HEALTHCHECK
 * - Fly.io health checks
 * - Monitoring systems
 *
 * Returns 200 OK if application is healthy
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Basic health check - app is responding
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      region: process.env.FLY_REGION || 'local',
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    // If health check fails, return 503 Service Unavailable
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
