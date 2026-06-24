import { chromium, FullConfig } from '@playwright/test'
import { login } from './helpers/auth'
import path from 'path'

/**
 * Logs in ONCE and saves the session to storageState, which every spec reuses.
 * This avoids each test (× each project) re-hitting the BetterAuth sign-in form —
 * which trips the auth rate limiter (handbook H.6) and makes the suite flaky.
 */
export const STORAGE_STATE = path.join(__dirname, '.auth/state.json')

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })
  await login(page)
  await page.context().storageState({ path: STORAGE_STATE })
  await browser.close()
}
