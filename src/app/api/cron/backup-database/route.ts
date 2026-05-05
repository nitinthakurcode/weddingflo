/**
 * Database Backup Cron Endpoint
 *
 * April 2026 - Daily cron to trigger PostgreSQL backup to Cloudflare R2.
 * Executes scripts/backup-postgres.sh which handles:
 * - Compressed pg_dump
 * - R2 upload
 * - 30-day retention cleanup
 * - Integrity verification
 *
 * Called by Dokploy cron daily: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://web:3000/api/cron/backup-database`
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const startTime = Date.now();
    const scriptPath = path.resolve(process.cwd(), 'scripts/backup-postgres.sh');

    console.log('[Cron] Starting database backup...');

    const { stdout, stderr } = await execAsync(`bash ${scriptPath}`, {
      timeout: 600000, // 10 minute timeout
      env: {
        ...process.env,
        // Pass DB connection from DATABASE_URL if individual vars not set
        POSTGRES_HOST: process.env.POSTGRES_HOST || '',
        POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
        POSTGRES_DB: process.env.POSTGRES_DB || '',
        POSTGRES_USER: process.env.POSTGRES_USER || '',
        PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
        // R2 credentials
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || '',
      },
    });

    const durationMs = Date.now() - startTime;

    if (stderr && !stderr.includes('[INFO]')) {
      console.warn('[Cron] backup-database stderr:', stderr);
    }

    console.log(`[Cron] Database backup completed in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      durationMs,
      timestamp: new Date().toISOString(),
      output: stdout.slice(-500), // Last 500 chars of output
    });
  } catch (error) {
    console.error('[Cron] backup-database error:', error);

    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Backup failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
