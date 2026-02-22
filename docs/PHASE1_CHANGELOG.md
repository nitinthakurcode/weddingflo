# Phase 1 Security Changelog

Phase 1 code implementation is **COMPLETE**.

> **Middleware-free architecture** — all security headers via `next.config.ts` + Cloudflare, zero latency on API/tRPC/SSE routes.

## Files Modified

| File | Change |
|------|--------|
| `next.config.ts` | Added static security headers: CSP (removed `unsafe-eval`), HSTS with `preload` + `includeSubDomains` + 2-year max-age, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restricting camera/microphone/geolocation |
| `src/lib/storage/r2-client.ts` | Added `validateStorageKey()` (rejects `..`, leading `/`, `//`, null bytes, >1024 chars). Added `getPresignedUploadUrl()` using PutObjectCommand (fixes bug where GetObjectCommand was used for uploads). Added `FILE_TYPES` allowlists per category (IMAGES, DOCUMENTS, VIDEOS, AUDIO — no SVG, no legacy Office, no executables). Added `FILE_SIZE_LIMITS` per category (images 10MB, documents 25MB, videos 100MB, audio 25MB). |
| `src/features/media/server/routers/storage.router.ts` | `getUploadUrl`: validates companyId, enforces per-category file size limits, validates MIME type against category allowlist (no 'other' bypass), validates key with `validateStorageKey()`, uses `getPresignedUploadUrl()` with 900s TTL. `getDownloadUrl`: validates key, enforces `documents/{companyId}/` prefix (tenant isolation), 3600s TTL. `deleteFile`/`bulkDelete`: tenant isolation + path traversal. `listFiles`: prefix scoped to company. |
| `src/features/media/server/routers/documents.router.ts` | Changed import from stub `@/lib/storage` (no-op `deleteDocument()`) to `@/lib/storage/r2-client` (`deleteFile`, `validateStorageKey`). Delete path now: extracts 4-segment key (`documents/company/client/filename`), validates with `validateStorageKey()`, checks `documents/{companyId}/` prefix for tenant isolation, calls real `deleteFile()`. |
| `.env.production.example` | Added R2 environment variable templates |

## Files Added

| File | Description |
|------|-------------|
| `tests/security/r2-validation.test.ts` | 34 unit tests: `validateStorageKey` (9), `validateFile` (10), `generateFileKey` (5), `FILE_TYPES` constants (5), `FILE_SIZE_LIMITS` constants (5 — includes no 'other' category check) |
| `tests/security/r2-tenant-isolation.test.ts` | 51 integration tests: companyId prefix enforcement (10), path traversal rejection (6), MIME type validation per category (21), category 'other' rejection (3), file size limits per category (8), presigned URL TTL values (3) |
| `scripts/rotate-secrets.sh` | Secret rotation script |
| `scripts/verify-deployment.sh` | Deployment verification script |

## Test Results

- **85 new security tests**: all passing
- **Full suite**: 361/373 passing (3 pre-existing env-dependent failures unrelated to Phase 1)
- **0 regressions** introduced by Phase 1 changes
