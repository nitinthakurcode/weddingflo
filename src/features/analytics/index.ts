/**
 * Analytics Feature Pocket
 *
 * @description Business intelligence, reporting, and data import/export
 * @owner Analytics Team
 * @stability stable
 *
 * ## Capabilities
 * - Revenue analytics & trends
 * - Payment status tracking
 * - Notification statistics
 * - Budget tracking & predictions
 * - Data export (CSV, XLSX)
 * - Data import (CSV, XLSX)
 * - Client insights & reporting
 *
 * ## External Dependencies
 * - Supabase: Analytics RPC functions, all business tables
 * - XLSX library: Excel import/export
 * - Chart libraries: Recharts for visualizations
 *
 * ## Database Functions
 * - get_revenue_analytics(): Revenue aggregation
 * - get_payment_status_summary(): Payment breakdowns
 * - get_notification_stats(): Communication metrics
 * - get_top_clients(): Client rankings
 *
 * ## Performance Optimization
 * - Heavy queries use database RPC functions
 * - Results cached for 5 minutes (Redis recommended)
 * - Export/import jobs run async for large datasets
 * - Pagination for all list endpoints
 *
 * ## Data Export/Import
 * - Formats: CSV, XLSX (Excel)
 * - Max rows: 10,000 per export (split into batches)
 * - Import validation: Schema validation before import
 * - Rollback support: Transaction-based imports
 *
 * ## Rate Limits
 * - Analytics queries: 100/min per company
 * - Export: 10/hour per user
 * - Import: 5/hour per user (heavy operation)
 *
 * ## Scalability Notes
 * Read-heavy pocket - implement aggressive caching
 * Consider read replicas for analytics queries
 * Materialize views for frequently accessed aggregations
 * Archive old data (>1 year) to separate cold storage
 *
 * ## Data Retention
 * - Active data: 1 year in hot storage
 * - Historical data: 3 years in cold storage
 * - Analytics snapshots: Daily aggregations for trends
 */

export * from './server/routers';
