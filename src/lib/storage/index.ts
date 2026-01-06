/**
 * Storage Module - Stub
 *
 * File storage operations (S3, local, etc.)
 * TODO: Implement full functionality
 */

export async function uploadFile(file: File | Buffer, path: string): Promise<string> {
  console.warn('Storage not configured - uploadFile stub');
  return `https://storage.example.com/${path}`;
}

export async function deleteFile(path: string): Promise<void> {
  console.warn('Storage not configured - deleteFile stub');
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  console.warn('Storage not configured - getSignedUrl stub');
  return `https://storage.example.com/${path}?expires=${expiresIn}`;
}

export async function listFiles(prefix: string): Promise<string[]> {
  console.warn('Storage not configured - listFiles stub');
  return [];
}

// Alias for backwards compatibility
export const deleteDocument = deleteFile;

export async function downloadFile(path: string): Promise<Buffer | null> {
  console.warn('Storage not configured - downloadFile stub');
  return null;
}

export async function getFileMetadata(path: string): Promise<{ size: number; contentType: string } | null> {
  console.warn('Storage not configured - getFileMetadata stub');
  return null;
}
