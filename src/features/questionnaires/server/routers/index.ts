/**
 * Questionnaires Feature - tRPC Routers
 * February 2026 - Client questionnaire system for WeddingFlo
 *
 * Business Domain: Client Intake & Data Collection
 * Routers:
 * - questionnaires: Template management, questionnaire instances, public submission
 *
 * Dependencies:
 * - Drizzle ORM (questionnaire_templates, questionnaires, questionnaire_responses tables)
 * - Public routes for client submission (no auth required)
 *
 * Owner: Client Experience Team
 */

export { questionnairesRouter } from './questionnaires.router';
