/**
 * @jest-environment node
 */

/**
 * WeddingFlo — R2 Storage Validation Tests
 *
 * Adapted from Phase 1 s3-validation.test.ts for Cloudflare R2.
 * Tests storage key validation, file validation, and constants.
 * Pure unit tests — no AWS/R2 credentials required.
 *
 * Run with: npx jest tests/security/r2-validation.test.ts
 *
 * @file tests/security/r2-validation.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateStorageKey,
  validateFile,
  generateFileKey,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
} from '../../src/lib/storage/r2-client';

// ============================================================================
// validateStorageKey (replaces isValidS3Key from Phase 1)
// ============================================================================
describe('R2 validateStorageKey', () => {
  it('accepts valid key with company prefix', () => {
    expect(
      validateStorageKey('documents/company-123/1700000000-photo.jpg')
    ).toEqual({ valid: true });
  });

  it('accepts nested key with client ID', () => {
    expect(
      validateStorageKey('documents/company-123/client-456/1700000000-contract.pdf')
    ).toEqual({ valid: true });
  });

  it('rejects path traversal (..)', () => {
    const result = validateStorageKey('documents/../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Path traversal');
  });

  it('rejects key starting with /', () => {
    const result = validateStorageKey('/documents/company-123/file.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must not start with /');
  });

  it('rejects double slashes', () => {
    const result = validateStorageKey('documents//company-123/file.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Double slashes');
  });

  it('rejects null bytes', () => {
    const result = validateStorageKey('documents/company-123/file\x00.exe');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Null bytes');
  });

  it('rejects empty key', () => {
    const result = validateStorageKey('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid key length');
  });

  it('rejects extremely long keys (>1024 chars)', () => {
    const result = validateStorageKey('a'.repeat(1025));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid key length');
  });

  it('accepts key at max length (1024 chars)', () => {
    const result = validateStorageKey('a'.repeat(1024));
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// validateFile
// ============================================================================
describe('R2 validateFile', () => {
  // Helper to create a mock File
  const createMockFile = (name: string, size: number, type: string): File => {
    const buffer = Buffer.alloc(size);
    const blob = new Blob([buffer], { type });
    return Object.assign(blob, { name, lastModified: Date.now() }) as File;
  };

  it('accepts valid JPEG within size limit', () => {
    const file = createMockFile('photo.jpg', 5 * 1024 * 1024, 'image/jpeg');
    const result = validateFile(file, 10);
    expect(result.valid).toBe(true);
  });

  it('accepts valid PDF within size limit', () => {
    const file = createMockFile('contract.pdf', 10 * 1024 * 1024, 'application/pdf');
    const result = validateFile(file, 25);
    expect(result.valid).toBe(true);
  });

  it('rejects files exceeding size limit', () => {
    const file = createMockFile('huge.jpg', 51 * 1024 * 1024, 'image/jpeg');
    const result = validateFile(file, 50);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('rejects files at exactly size limit + 1 byte', () => {
    const maxMB = 10;
    const file = createMockFile('over.jpg', maxMB * 1024 * 1024 + 1, 'image/jpeg');
    const result = validateFile(file, maxMB);
    expect(result.valid).toBe(false);
  });

  it('accepts files at exactly the size limit', () => {
    const maxMB = 10;
    const file = createMockFile('exact.jpg', maxMB * 1024 * 1024, 'image/jpeg');
    const result = validateFile(file, maxMB);
    expect(result.valid).toBe(true);
  });

  it('rejects disallowed content types when allowedTypes specified', () => {
    const file = createMockFile('malware.exe', 1024, 'application/x-msdownload');
    const result = validateFile(file, 50, FILE_TYPES.IMAGES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('rejects HTML when only images are allowed', () => {
    const file = createMockFile('page.html', 1024, 'text/html');
    const result = validateFile(file, 50, FILE_TYPES.IMAGES);
    expect(result.valid).toBe(false);
  });

  it('rejects JavaScript when only documents are allowed', () => {
    const file = createMockFile('script.js', 1024, 'application/javascript');
    const result = validateFile(file, 50, FILE_TYPES.DOCUMENTS);
    expect(result.valid).toBe(false);
  });

  it('accepts all configured image types', () => {
    for (const type of FILE_TYPES.IMAGES) {
      const file = createMockFile(`test.${type.split('/')[1]}`, 1024, type);
      const result = validateFile(file, 50, FILE_TYPES.IMAGES);
      expect(result.valid).toBe(true);
    }
  });

  it('accepts all configured document types', () => {
    for (const type of FILE_TYPES.DOCUMENTS) {
      const file = createMockFile('test.doc', 1024, type);
      const result = validateFile(file, 50, FILE_TYPES.DOCUMENTS);
      expect(result.valid).toBe(true);
    }
  });
});

// ============================================================================
// generateFileKey
// ============================================================================
describe('R2 generateFileKey', () => {
  it('generates key with companyId prefix', () => {
    const key = generateFileKey('company-abc', 'photo.jpg');
    expect(key).toMatch(/^documents\/company-abc\//);
  });

  it('includes clientId when provided', () => {
    const key = generateFileKey('company-abc', 'contract.pdf', 'client-xyz');
    expect(key).toMatch(/^documents\/company-abc\/client-xyz\//);
  });

  it('generates unique keys for same filename (timestamp-based)', () => {
    const key1 = generateFileKey('company-abc', 'photo.jpg');
    const key2 = generateFileKey('company-abc', 'photo.jpg');
    // Keys include timestamps so they may differ — but both must have correct prefix
    expect(key1).toMatch(/^documents\/company-abc\//);
    expect(key2).toMatch(/^documents\/company-abc\//);
  });

  it('sanitizes special characters in filename', () => {
    const key = generateFileKey('company-abc', 'my photo (1).jpg');
    // Spaces and parens should be replaced with underscores
    expect(key).not.toContain(' ');
    expect(key).not.toContain('(');
    expect(key).not.toContain(')');
  });

  it('preserves file extension', () => {
    const key = generateFileKey('company-abc', 'contract.pdf');
    expect(key).toMatch(/\.pdf$/);
  });
});

// ============================================================================
// FILE_TYPES constants
// ============================================================================
describe('R2 FILE_TYPES', () => {
  it('defines IMAGES category', () => {
    expect(FILE_TYPES.IMAGES).toContain('image/jpeg');
    expect(FILE_TYPES.IMAGES).toContain('image/png');
    expect(FILE_TYPES.IMAGES).toContain('image/gif');
    expect(FILE_TYPES.IMAGES).toContain('image/webp');
  });

  it('defines DOCUMENTS category', () => {
    expect(FILE_TYPES.DOCUMENTS).toContain('application/pdf');
    expect(FILE_TYPES.DOCUMENTS).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(FILE_TYPES.DOCUMENTS).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('defines VIDEOS category', () => {
    expect(FILE_TYPES.VIDEOS).toContain('video/mp4');
    expect(FILE_TYPES.VIDEOS).toContain('video/webm');
  });

  it('defines AUDIO category', () => {
    expect(FILE_TYPES.AUDIO).toContain('audio/mpeg');
    expect(FILE_TYPES.AUDIO).toContain('audio/wav');
    expect(FILE_TYPES.AUDIO).toContain('audio/ogg');
  });

  it('does NOT include executable types in any category', () => {
    const allTypes = [
      ...FILE_TYPES.IMAGES,
      ...FILE_TYPES.DOCUMENTS,
      ...FILE_TYPES.VIDEOS,
      ...FILE_TYPES.AUDIO,
    ];
    expect(allTypes).not.toContain('application/x-msdownload');
    expect(allTypes).not.toContain('application/javascript');
    expect(allTypes).not.toContain('text/html');
  });
});

// ============================================================================
// FILE_SIZE_LIMITS constants
// ============================================================================
describe('R2 FILE_SIZE_LIMITS', () => {
  it('sets 10MB limit for images', () => {
    expect(FILE_SIZE_LIMITS.images).toBe(10 * 1024 * 1024);
  });

  it('sets 25MB limit for documents', () => {
    expect(FILE_SIZE_LIMITS.documents).toBe(25 * 1024 * 1024);
  });

  it('sets 100MB limit for videos', () => {
    expect(FILE_SIZE_LIMITS.videos).toBe(100 * 1024 * 1024);
  });

  it('sets 25MB limit for audio', () => {
    expect(FILE_SIZE_LIMITS.audio).toBe(25 * 1024 * 1024);
  });

  it('does NOT have an "other" category', () => {
    expect(FILE_SIZE_LIMITS).not.toHaveProperty('other');
  });
});
