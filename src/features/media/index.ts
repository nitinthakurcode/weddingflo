/**
 * Media Feature Pocket
 *
 * @description File storage, asset management, and creative job tracking
 * @owner Media Team
 * @stability stable
 *
 * ## Capabilities
 * - Document upload & storage
 * - File retrieval with presigned URLs
 * - Creative job tracking (photography, videography)
 * - Asset organization & tagging
 * - Multi-format support (images, videos, documents)
 *
 * ## External Dependencies
 * - Cloudflare R2 / AWS S3: Object storage
 * - Cloudflare CDN: Asset delivery
 * - Supabase: documents, creative_jobs tables
 *
 * ## Database Tables
 * - documents (primary)
 * - creative_jobs (primary)
 *
 * ## Storage Configuration
 * - Max file size: 50MB per upload
 * - Allowed types: images (jpg, png, webp), videos (mp4, mov), documents (pdf, docx)
 * - Storage: Cloudflare R2 (S3-compatible)
 * - CDN: Cloudflare for global delivery
 *
 * ## Security
 * - Presigned URLs with expiration (15 minutes default)
 * - Company-based access control
 * - Virus scanning for uploads (ClamAV recommended)
 * - File type validation (MIME type + magic bytes)
 *
 * ## Cost Management
 * - R2 storage: $0.015/GB/month
 * - R2 egress: Free (Class A operations: $4.50/million)
 * - CDN bandwidth: Included with Cloudflare
 *
 * ## Rate Limits
 * - Upload: 10 files/min per user
 * - Download: 1000/min per company
 * - Presigned URL generation: 100/min per user
 *
 * ## Scalability Notes
 * High bandwidth pocket - CDN is essential
 * Consider image optimization service (e.g., Cloudflare Images)
 * Implement lazy loading for galleries
 * Use thumbnails/previews for list views
 */

export * from './server/routers';
