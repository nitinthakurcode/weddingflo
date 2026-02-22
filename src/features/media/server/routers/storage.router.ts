/**
 * Storage tRPC Router
 *
 * Handles file uploads, downloads, and management via Cloudflare R2
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import {
  getPresignedUrl,
  getPresignedUploadUrl,
  deleteFile,
  listFiles,
  generateFileKey,
  validateStorageKey,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
} from '@/lib/storage/r2-client';

export const storageRouter = router({
  /**
   * Generate presigned URL for upload
   * Client uploads directly to R2 using this URL
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.string(),
        fileSize: z.number().positive(),
        clientId: z.string().optional(),
        category: z
          .enum(['documents', 'images', 'videos', 'audio'])
          .default('documents'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Validate file size against per-category limit
      const maxSize = FILE_SIZE_LIMITS[input.category];
      if (input.fileSize > maxSize) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File size exceeds ${maxSize / 1024 / 1024}MB limit for ${input.category}`,
        });
      }

      // Validate MIME type against category allowlist (no 'other' bypass)
      const allowedTypes: Record<string, string[]> = {
        documents: FILE_TYPES.DOCUMENTS,
        images: FILE_TYPES.IMAGES,
        videos: FILE_TYPES.VIDEOS,
        audio: FILE_TYPES.AUDIO,
      };

      const allowed = allowedTypes[input.category];
      if (!allowed.includes(input.fileType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type ${input.fileType} not allowed for category ${input.category}`,
        });
      }

      // Generate unique key (always prefixed with companyId for tenant isolation)
      const key = generateFileKey(companyId, input.fileName, input.clientId);

      // Path traversal prevention
      const keyValidation = validateStorageKey(key);
      if (!keyValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: keyValidation.error || 'Invalid file key',
        });
      }

      // BUG FIX: Use PutObjectCommand for uploads (was incorrectly using GetObjectCommand)
      // TTL reduced from 3600s to 900s (15 min)
      const uploadUrl = await getPresignedUploadUrl(key, input.fileType, 900);

      return {
        uploadUrl,
        key,
        expiresIn: 900,
      };
    }),

  /**
   * Get presigned URL for download
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Path traversal prevention
      const keyValidation = validateStorageKey(input.key);
      if (!keyValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: keyValidation.error || 'Invalid file key',
        });
      }

      // Verify key belongs to user's company (tenant isolation)
      if (!input.key.startsWith(`documents/${companyId}/`)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this file',
        });
      }

      // Download URL uses GetObjectCommand (1 hour TTL)
      const url = await getPresignedUrl(input.key, 3600);

      return {
        url,
        expiresIn: 3600,
      };
    }),

  /**
   * Delete a file
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Path traversal prevention
      const keyValidation = validateStorageKey(input.key);
      if (!keyValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: keyValidation.error || 'Invalid file key',
        });
      }

      // Verify key belongs to user's company (tenant isolation)
      if (!input.key.startsWith(`documents/${companyId}/`)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this file',
        });
      }

      await deleteFile(input.key);

      return { success: true, key: input.key };
    }),

  /**
   * List files for a company or client
   */
  listFiles: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        maxKeys: z.number().min(1).max(100).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      const prefix = input.clientId
        ? `documents/${companyId}/${input.clientId}/`
        : `documents/${companyId}/`;

      // Path traversal prevention (clientId could contain ../)
      const keyValidation = validateStorageKey(prefix);
      if (!keyValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: keyValidation.error || 'Invalid path',
        });
      }

      const files = await listFiles(prefix, input.maxKeys);

      return {
        files,
        prefix,
        count: files.length,
      };
    }),

  /**
   * Bulk delete files
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        keys: z.array(z.string().min(1)).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Path traversal prevention on all keys
      for (const key of input.keys) {
        const keyValidation = validateStorageKey(key);
        if (!keyValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid key: ${keyValidation.error}`,
          });
        }
      }

      // Verify all keys belong to user's company (tenant isolation)
      const invalidKeys = input.keys.filter(
        (key) => !key.startsWith(`documents/${companyId}/`)
      );

      if (invalidKeys.length > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Access denied to ${invalidKeys.length} file(s)`,
        });
      }

      // Delete all files
      const results = await Promise.allSettled(
        input.keys.map((key) => deleteFile(key))
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        successful,
        failed,
        total: input.keys.length,
      };
    }),
});
