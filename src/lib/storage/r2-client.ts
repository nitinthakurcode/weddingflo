/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible object storage with:
 * - Zero egress fees (vs $891/mo on AWS S3)
 * - 11 nines durability (99.999999999%)
 * - Automatic Cloudflare CDN integration
 * - $0.015/GB/month storage cost
 *
 * Usage:
 * - Upload files: uploadFile()
 * - Generate presigned URLs: getPresignedUrl()
 * - Delete files: deleteFile()
 * - List files: listFiles()
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Environment validation
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn(
    'R2 environment variables not configured. File storage will not work.'
  );
}

/**
 * Initialize R2 Client (S3-compatible)
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * File Upload Options
 */
export interface UploadOptions {
  file: File | Buffer;
  key: string; // Path in bucket (e.g., "documents/client-123/contract.pdf")
  contentType?: string;
  metadata?: Record<string, string>;
  expiresIn?: number; // Seconds (for presigned URLs)
}

/**
 * Upload a file to R2
 *
 * @param options - Upload configuration
 * @returns Object with key, url, and CDN url
 */
export async function uploadFile(options: UploadOptions) {
  const { file, key, contentType, metadata } = options;

  // Convert File to Buffer if needed
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
    Metadata: metadata,
  });

  await r2Client.send(command);

  // Return URLs
  const baseUrl = `https://${R2_BUCKET_NAME}.${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const cdnUrl = `https://cdn.weddingflow.com/${key}`; // Custom domain via Cloudflare

  return {
    key,
    url: `${baseUrl}/${key}`, // Direct R2 URL
    cdnUrl, // CDN URL (recommended for public access)
    size: buffer.length,
    contentType: contentType || 'application/octet-stream',
  };
}

/**
 * Generate a presigned URL for temporary access
 *
 * @param key - File key in bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from R2
 *
 * @param key - File key to delete
 */
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
  });

  await r2Client.send(command);
  return { deleted: true, key };
}

/**
 * List files in a prefix (folder)
 *
 * @param prefix - Folder prefix (e.g., "documents/client-123/")
 * @param maxKeys - Maximum number of keys to return
 * @returns Array of file objects
 */
export async function listFiles(prefix: string = '', maxKeys: number = 1000) {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME!,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await r2Client.send(command);

  return (
    response.Contents?.map((item) => ({
      key: item.Key!,
      size: item.Size!,
      lastModified: item.LastModified!,
      etag: item.ETag!,
    })) || []
  );
}

/**
 * Get file metadata
 *
 * @param key - File key
 * @returns File metadata
 */
export async function getFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
  });

  const response = await r2Client.send(command);

  return {
    key,
    size: response.ContentLength!,
    contentType: response.ContentType!,
    lastModified: response.LastModified!,
    metadata: response.Metadata || {},
    etag: response.ETag!,
  };
}

/**
 * Generate a unique file key with timestamp
 *
 * @param companyId - Company ID
 * @param clientId - Client ID (optional)
 * @param fileName - Original file name
 * @returns Unique key
 */
export function generateFileKey(
  companyId: string,
  fileName: string,
  clientId?: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = clientId
    ? `documents/${companyId}/${clientId}`
    : `documents/${companyId}`;

  return `${basePath}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Validate file size and type
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in MB (default: 50MB)
 * @param allowedTypes - Allowed MIME types
 * @returns Validation result
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 50,
  allowedTypes?: string[]
): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Common file type categories
 */
export const FILE_TYPES = {
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEOS: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

export default {
  uploadFile,
  getPresignedUrl,
  deleteFile,
  listFiles,
  getFileMetadata,
  generateFileKey,
  validateFile,
  FILE_TYPES,
};
