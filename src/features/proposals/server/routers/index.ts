/**
 * Proposals Feature - tRPC Routers
 * February 2026 - Proposals & Contracts for WeddingFlo
 *
 * Business Domain: Proposals, Contracts, and E-Signatures
 * Routers:
 * - proposals: Proposal templates, creation, sending, tracking
 * - contracts: Contract templates, creation, e-signatures
 *
 * Dependencies:
 * - Drizzle ORM (proposals, contracts tables)
 * - BetterAuth (self-hosted authentication)
 *
 * Owner: Sales & Client Management
 */

export { proposalsRouter } from './proposals.router';
export { contractsRouter } from './contracts.router';
