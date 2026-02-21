/**
 * Workflows Feature - tRPC Routers
 * February 2026 - Workflow Automation for WeddingFlo
 *
 * Business Domain: Workflow Automation
 * Routers:
 * - workflows: Workflow definitions, steps, and execution tracking
 *
 * Dependencies:
 * - Drizzle ORM (workflows, workflow_steps, workflow_executions tables)
 * - PostgreSQL job queue (no Redis needed)
 *
 * Owner: Automation Team
 */

export { workflowsRouter } from './workflows.router';
