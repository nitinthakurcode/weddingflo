import { useTranslations as useNextIntlTranslations } from 'next-intl'

/**
 * Re-export next-intl's useTranslations for convenience
 *
 * Usage:
 * const t = useTranslations('common')
 * <button>{t('save')}</button>
 *
 * Namespace examples:
 * - 'common' - Common UI elements (save, cancel, delete, etc.)
 * - 'navigation' - Navigation items (dashboard, clients, etc.)
 * - 'dashboard' - Dashboard-specific translations
 * - 'clients' - Client management translations
 * - 'guests' - Guest management translations
 * - 'vendors' - Vendor management translations
 * - 'budget' - Budget management translations
 * - 'timeline' - Timeline management translations
 * - 'tasks' - Task management translations
 * - 'documents' - Document management translations
 * - 'ai' - AI features translations
 * - 'settings' - Settings page translations
 * - 'auth' - Authentication translations
 * - 'errors' - Error messages
 * - 'onboarding' - Onboarding flow translations
 */
export const useTranslations = useNextIntlTranslations
