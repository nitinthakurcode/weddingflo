/**
 * Media Feature - tRPC Routers
 *
 * Business Domain: File & Asset Management
 * Routers:
 * - documents: Document storage & retrieval
 * - storage: Presigned URL generation for S3/R2
 * - creatives: Creative job tracking
 *
 * Dependencies:
 * - Supabase (documents, creative_jobs)
 * - Cloudflare R2 / AWS S3
 *
 * Storage Limits:
 * - Max file size: 50MB
 * - Allowed types: images, videos, documents
 * - CDN: Cloudflare for delivery
 */

export { documentsRouter } from './documents.router';
export { storageRouter } from './storage.router';
export { creativesRouter } from './creatives.router';
