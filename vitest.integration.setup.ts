// Integration test setup — runs in the worker BEFORE any test module imports
// `@/lib/db` (which connects eagerly using process.env.DATABASE_URL). We load
// .env.local here so DATABASE_URL (local Postgres) is present at db-import time.
import { config as loadEnv } from 'dotenv'
import path from 'path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Integration tests require DATABASE_URL (set in .env.local). Local Postgres must be running.',
  )
}
