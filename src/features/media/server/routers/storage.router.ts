/**
 * Storage tRPC Router
 *
 * Handles file uploads, downloads, and management via Cloudflare R2
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import {
  uploadFile,
  getPresignedUrl,
  deleteFile,
  listFiles,
  generateFileKey,
  validateFile,
  FILE_TYPES,
} from '@/lib/storage/r2-client';

export const storageRouter = router({
  /**
   * Generate presigned URL for upload
   * Client uploads directly to R2 using this URL
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        clientId: z.string().optional(),
        category: z
          .enum(['documents', 'images', 'videos', 'audio', 'other'])
          .default('documents'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Validate file size (max 50MB)
      if (input.fileSize > 50 * 1024 * 1024) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size exceeds 50MB limit',
        });
      }

      // Validate file type based on category
      const allowedTypes: Record<string, string[]> = {
        documents: FILE_TYPES.DOCUMENTS,
        images: FILE_TYPES.IMAGES,
        videos: FILE_TYPES.VIDEOS,
        audio: FILE_TYPES.AUDIO,
        other: [], // Allow all for 'other'
      };

      const allowed = allowedTypes[input.category];
      if (allowed.length > 0 && !allowed.includes(input.fileType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type ${input.fileType} not allowed for category ${input.category}`,
        });
      }

      // Generate unique key
      const key = generateFileKey(companyId, input.fileName, input.clientId);

      // Generate presigned URL (valid for 1 hour)
      const uploadUrl = await getPresignedUrl(key, 3600);

      return {
        uploadUrl,
        key,
        expiresIn: 3600,
      };
    }),

  /**
   * Get presigned URL for download
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        expiresIn: z.number().default(3600), // 1 hour default
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Verify key belongs to user's company
      if (!input.key.startsWith(`documents/${companyId}/`)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this file',
        });
      }

      const url = await getPresignedUrl(input.key, input.expiresIn);

      return {
        url,
        expiresIn: input.expiresIn,
      };
    }),

  /**
   * Delete a file
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Verify key belongs to user's company
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
        maxKeys: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx;

      const prefix = input.clientId
        ? `documents/${companyId}/${input.clientId}/`
        : `documents/${companyId}/`;

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
        keys: z.array(z.string()).max(100), // Max 100 files at once
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx;

      // Verify all keys belong to user's company
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
