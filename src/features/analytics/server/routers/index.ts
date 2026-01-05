/**
 * Analytics Feature - tRPC Routers
 *
 * Business Domain: Business Intelligence & Reporting
 * Routers:
 * - analytics: Revenue, payment, notification stats
 * - budget: Budget tracking & predictions
 * - export: Data export (CSV, XLSX)
 * - import: Data import (CSV, XLSX)
 *
 * Dependencies:
 * - Supabase (analytics RPC functions)
 * - XLSX library for imports/exports
 *
 * Performance:
 * - Heavy queries use database RPC functions
 * - Results cached for 5 minutes
 * - Export/import jobs run async for large datasets
 */

export { analyticsRouter } from './analytics.router';
export { budgetRouter } from './budget.router';
export { internalBudgetRouter } from './internal-budget.router';
export { exportRouter } from './export.router';
export { importRouter } from './import.router';
