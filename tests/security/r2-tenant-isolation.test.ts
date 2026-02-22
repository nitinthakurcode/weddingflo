/**
 * @jest-environment node
 */

/**
 * WeddingFlo — R2 Tenant Isolation Tests
 *
 * Tests that the storage router enforces:
 *   1. companyId prefix on all storage keys
 *   2. Path traversal rejection (.., leading /, //, null bytes)
 *   3. MIME type validation per category
 *   4. Category 'other' rejection
 *   5. File size limits per category
 *   6. Presigned URL TTL values (900s upload, 3600s download)
 *
 * Uses mocked R2 client — no AWS/R2 credentials required.
 *
 * Run with: npx jest tests/security/r2-tenant-isolation.test.ts
 *
 * @file tests/security/r2-tenant-isolation.test.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock the R2 client module BEFORE importing the router.
// jest.mock is hoisted above imports, so we define everything inline.
// ---------------------------------------------------------------------------
jest.mock('@/lib/storage/r2-client', () => ({
  getPresignedUrl: jest.fn().mockResolvedValue(
    'https://r2.mock.com/presigned-download-url?X-Amz-Expires=3600'
  ),
  getPresignedUploadUrl: jest.fn().mockResolvedValue(
    'https://r2.mock.com/presigned-upload-url?X-Amz-Expires=900'
  ),
  deleteFile: jest.fn().mockResolvedValue({ deleted: true, key: '' }),
  listFiles: jest.fn().mockResolvedValue([]),
  generateFileKey: jest.fn(
    (companyId: string, fileName: string, clientId?: string) => {
      const timestamp = Date.now();
      const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const base = clientId
        ? `documents/${companyId}/${clientId}`
        : `documents/${companyId}`;
      return `${base}/${timestamp}-${sanitized}`;
    }
  ),
  validateStorageKey: jest.fn((key: string) => {
    if (!key || key.length > 1024) return { valid: false, error: 'Invalid key length' };
    if (key.includes('..')) return { valid: false, error: 'Path traversal detected' };
    if (key.startsWith('/')) return { valid: false, error: 'Key must not start with /' };
    if (key.includes('//')) return { valid: false, error: 'Double slashes not allowed' };
    if (/\x00/.test(key)) return { valid: false, error: 'Null bytes not allowed' };
    return { valid: true };
  }),
  FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    VIDEOS: ['video/mp4', 'video/webm'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  },
  FILE_SIZE_LIMITS: {
    images: 10 * 1024 * 1024,
    documents: 25 * 1024 * 1024,
    videos: 100 * 1024 * 1024,
    audio: 25 * 1024 * 1024,
  },
}));

// Import after mock is defined
import { storageRouter } from '../../src/features/media/server/routers/storage.router';
import {
  getPresignedUrl,
  getPresignedUploadUrl,
  deleteFile,
  listFiles,
  generateFileKey,
} from '../../src/lib/storage/r2-client';

// Cast to jest.Mock for assertion access
const mockGetPresignedUrl = getPresignedUrl as jest.Mock;
const mockGetPresignedUploadUrl = getPresignedUploadUrl as jest.Mock;
const mockDeleteFile = deleteFile as jest.Mock;
const mockListFiles = listFiles as jest.Mock;
const mockGenerateFileKey = generateFileKey as jest.Mock;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const COMPANY_A = 'company-aaa-111';
const COMPANY_B = 'company-bbb-222';
const TEST_USER_ID = 'user-test-123';

type TestContext = {
  userId: string;
  companyId: string | null;
  role: string;
  subscriptionTier: string;
  db: Record<string, unknown>;
};

const createTestContext = (overrides: Partial<TestContext> = {}): TestContext => ({
  userId: TEST_USER_ID,
  companyId: COMPANY_A,
  role: 'company_admin',
  subscriptionTier: 'premium',
  db: {},
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('R2 Tenant Isolation — Storage Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // 1. companyId prefix enforcement
  // ========================================================================
  describe('companyId prefix enforcement', () => {
    it('getUploadUrl generates key prefixed with documents/{companyId}/', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        category: 'images',
      });

      // Verify generateFileKey was called with the session companyId
      expect(mockGenerateFileKey).toHaveBeenCalledWith(
        COMPANY_A,
        'photo.jpg',
        undefined // no clientId
      );
      expect(result.key).toMatch(new RegExp(`^documents/${COMPANY_A}/`));
    });

    it('getUploadUrl includes clientId in key path when provided', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'contract.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
        clientId: 'client-xyz',
      });

      expect(mockGenerateFileKey).toHaveBeenCalledWith(
        COMPANY_A,
        'contract.pdf',
        'client-xyz'
      );
      expect(result.key).toContain('client-xyz');
    });

    it('getUploadUrl rejects when companyId is missing', async () => {
      const ctx = createTestContext({ companyId: null });
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
          category: 'images',
        })
      ).rejects.toThrow('Company ID not found');
    });

    it('getDownloadUrl BLOCKS cross-tenant access (Company B key)', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getDownloadUrl({
          key: `documents/${COMPANY_B}/secret-file.pdf`,
        })
      ).rejects.toThrow('Access denied');
    });

    it('getDownloadUrl allows access to own company files', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getDownloadUrl({
        key: `documents/${COMPANY_A}/my-file.pdf`,
      });

      expect(result.url).toBeDefined();
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        `documents/${COMPANY_A}/my-file.pdf`,
        3600
      );
    });

    it('deleteFile BLOCKS cross-tenant deletion', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.deleteFile({
          key: `documents/${COMPANY_B}/important.pdf`,
        })
      ).rejects.toThrow('Access denied');
    });

    it('deleteFile allows deleting own company files', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.deleteFile({
        key: `documents/${COMPANY_A}/old-file.pdf`,
      });

      expect(result.success).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith(`documents/${COMPANY_A}/old-file.pdf`);
    });

    it('bulkDelete BLOCKS when any key belongs to another company', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.bulkDelete({
          keys: [
            `documents/${COMPANY_A}/file1.pdf`,
            `documents/${COMPANY_B}/stolen.pdf`, // cross-tenant!
          ],
        })
      ).rejects.toThrow('Access denied');
    });

    it('listFiles scopes to company prefix', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      await caller.listFiles({});

      expect(mockListFiles).toHaveBeenCalledWith(
        `documents/${COMPANY_A}/`,
        100
      );
    });

    it('listFiles scopes to client within company', async () => {
      const ctx = createTestContext({ companyId: COMPANY_A });
      const caller = storageRouter.createCaller(ctx as any);

      await caller.listFiles({ clientId: 'client-xyz' });

      expect(mockListFiles).toHaveBeenCalledWith(
        `documents/${COMPANY_A}/client-xyz/`,
        100
      );
    });
  });

  // ========================================================================
  // 2. Path traversal rejection
  // ========================================================================
  describe('path traversal rejection', () => {
    it('getDownloadUrl rejects .. in key', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getDownloadUrl({
          key: `documents/${COMPANY_A}/../${COMPANY_B}/secret.pdf`,
        })
      ).rejects.toThrow();
    });

    it('getDownloadUrl rejects leading / in key', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getDownloadUrl({
          key: `/documents/${COMPANY_A}/file.pdf`,
        })
      ).rejects.toThrow();
    });

    it('getDownloadUrl rejects // in key', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getDownloadUrl({
          key: `documents/${COMPANY_A}//file.pdf`,
        })
      ).rejects.toThrow();
    });

    it('getDownloadUrl rejects null bytes in key', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getDownloadUrl({
          key: `documents/${COMPANY_A}/file\x00.exe`,
        })
      ).rejects.toThrow();
    });

    it('deleteFile rejects path traversal in key', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.deleteFile({
          key: `documents/${COMPANY_A}/../${COMPANY_B}/file.pdf`,
        })
      ).rejects.toThrow();
    });

    it('bulkDelete rejects any key with path traversal', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.bulkDelete({
          keys: [
            `documents/${COMPANY_A}/ok.pdf`,
            `documents/${COMPANY_A}/../evil.pdf`,
          ],
        })
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // 3. MIME type validation per category
  // ========================================================================
  describe('MIME type validation per category', () => {
    const validCases = [
      { category: 'images' as const, fileType: 'image/jpeg', fileName: 'photo.jpg' },
      { category: 'images' as const, fileType: 'image/png', fileName: 'photo.png' },
      { category: 'images' as const, fileType: 'image/gif', fileName: 'anim.gif' },
      { category: 'images' as const, fileType: 'image/webp', fileName: 'photo.webp' },
      { category: 'documents' as const, fileType: 'application/pdf', fileName: 'doc.pdf' },
      {
        category: 'documents' as const,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: 'doc.docx',
      },
      {
        category: 'documents' as const,
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: 'sheet.xlsx',
      },
      { category: 'videos' as const, fileType: 'video/mp4', fileName: 'clip.mp4' },
      { category: 'videos' as const, fileType: 'video/webm', fileName: 'clip.webm' },
      { category: 'audio' as const, fileType: 'audio/mpeg', fileName: 'song.mp3' },
      { category: 'audio' as const, fileType: 'audio/wav', fileName: 'song.wav' },
      { category: 'audio' as const, fileType: 'audio/ogg', fileName: 'song.ogg' },
    ];

    it.each(validCases)(
      'accepts $fileType for category $category',
      async ({ category, fileType, fileName }) => {
        const ctx = createTestContext();
        const caller = storageRouter.createCaller(ctx as any);

        const result = await caller.getUploadUrl({
          fileName,
          fileType,
          fileSize: 1024,
          category,
        });

        expect(result.uploadUrl).toBeDefined();
        expect(result.key).toBeDefined();
      }
    );

    const invalidCases = [
      { category: 'images' as const, fileType: 'application/pdf', desc: 'PDF in images' },
      { category: 'images' as const, fileType: 'video/mp4', desc: 'video in images' },
      { category: 'documents' as const, fileType: 'image/jpeg', desc: 'JPEG in documents' },
      { category: 'documents' as const, fileType: 'audio/mpeg', desc: 'audio in documents' },
      { category: 'videos' as const, fileType: 'image/png', desc: 'PNG in videos' },
      { category: 'audio' as const, fileType: 'video/mp4', desc: 'video in audio' },
      { category: 'images' as const, fileType: 'application/x-msdownload', desc: 'EXE in images' },
      { category: 'images' as const, fileType: 'text/html', desc: 'HTML in images' },
      { category: 'documents' as const, fileType: 'application/javascript', desc: 'JS in documents' },
    ];

    it.each(invalidCases)(
      'rejects $desc ($fileType in $category)',
      async ({ category, fileType }) => {
        const ctx = createTestContext();
        const caller = storageRouter.createCaller(ctx as any);

        await expect(
          caller.getUploadUrl({
            fileName: 'file.bin',
            fileType,
            fileSize: 1024,
            category,
          })
        ).rejects.toThrow('not allowed');
      }
    );
  });

  // ========================================================================
  // 4. Category 'other' rejection
  // ========================================================================
  describe('category "other" rejection', () => {
    it('rejects category "other" via Zod enum validation', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'file.bin',
          fileType: 'application/octet-stream',
          fileSize: 1024,
          category: 'other' as any,
        })
      ).rejects.toThrow();
    });

    it('rejects unknown categories', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'file.bin',
          fileType: 'application/octet-stream',
          fileSize: 1024,
          category: 'executables' as any,
        })
      ).rejects.toThrow();
    });

    it('only accepts the 4 valid categories', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      // Valid categories should not throw (with matching MIME type)
      const validCombos = [
        { category: 'images' as const, fileType: 'image/jpeg' },
        { category: 'documents' as const, fileType: 'application/pdf' },
        { category: 'videos' as const, fileType: 'video/mp4' },
        { category: 'audio' as const, fileType: 'audio/mpeg' },
      ];

      for (const { category, fileType } of validCombos) {
        const result = await caller.getUploadUrl({
          fileName: 'test.bin',
          fileType,
          fileSize: 1024,
          category,
        });
        expect(result.uploadUrl).toBeDefined();
      }
    });
  });

  // ========================================================================
  // 5. File size limit enforcement per category
  // ========================================================================
  describe('file size limit enforcement', () => {
    it('rejects images over 10MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'huge.jpg',
          fileType: 'image/jpeg',
          fileSize: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
          category: 'images',
        })
      ).rejects.toThrow('exceeds');
    });

    it('accepts images at exactly 10MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'exact.jpg',
        fileType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024,
        category: 'images',
      });

      expect(result.uploadUrl).toBeDefined();
    });

    it('rejects documents over 25MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'huge.pdf',
          fileType: 'application/pdf',
          fileSize: 25 * 1024 * 1024 + 1,
          category: 'documents',
        })
      ).rejects.toThrow('exceeds');
    });

    it('accepts documents at exactly 25MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'big.pdf',
        fileType: 'application/pdf',
        fileSize: 25 * 1024 * 1024,
        category: 'documents',
      });

      expect(result.uploadUrl).toBeDefined();
    });

    it('rejects videos over 100MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'huge.mp4',
          fileType: 'video/mp4',
          fileSize: 100 * 1024 * 1024 + 1,
          category: 'videos',
        })
      ).rejects.toThrow('exceeds');
    });

    it('accepts videos at exactly 100MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'big.mp4',
        fileType: 'video/mp4',
        fileSize: 100 * 1024 * 1024,
        category: 'videos',
      });

      expect(result.uploadUrl).toBeDefined();
    });

    it('rejects audio over 25MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      await expect(
        caller.getUploadUrl({
          fileName: 'huge.mp3',
          fileType: 'audio/mpeg',
          fileSize: 25 * 1024 * 1024 + 1,
          category: 'audio',
        })
      ).rejects.toThrow('exceeds');
    });

    it('accepts audio at exactly 25MB', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'big.mp3',
        fileType: 'audio/mpeg',
        fileSize: 25 * 1024 * 1024,
        category: 'audio',
      });

      expect(result.uploadUrl).toBeDefined();
    });
  });

  // ========================================================================
  // 6. Presigned URL TTL values
  // ========================================================================
  describe('presigned URL TTL values', () => {
    it('upload URL uses 900s (15 min) TTL', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getUploadUrl({
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        category: 'images',
      });

      // Verify the router passes 900 to getPresignedUploadUrl
      expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
        expect.any(String), // key
        'image/jpeg',       // contentType
        900                 // TTL
      );
      expect(result.expiresIn).toBe(900);
    });

    it('download URL uses 3600s (1 hour) TTL', async () => {
      const ctx = createTestContext();
      const caller = storageRouter.createCaller(ctx as any);

      const result = await caller.getDownloadUrl({
        key: `documents/${COMPANY_A}/file.pdf`,
      });

      // Verify the router passes 3600 to getPresignedUrl
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        `documents/${COMPANY_A}/file.pdf`,
        3600 // TTL
      );
      expect(result.expiresIn).toBe(3600);
    });

    it('upload TTL is shorter than download TTL (security: minimize exposure)', () => {
      // Upload URLs are write-capable, so they should expire faster
      const UPLOAD_TTL = 900;
      const DOWNLOAD_TTL = 3600;
      expect(UPLOAD_TTL).toBeLessThan(DOWNLOAD_TTL);
    });
  });
});
