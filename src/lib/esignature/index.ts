/**
 * E-Signature Module - Stub
 *
 * Electronic signature operations.
 * TODO: Implement full functionality
 */

export async function requestSignature(documentId: string, signers: string[]) {
  console.warn('E-Signature not configured - requestSignature stub');
  return { id: 'stub', status: 'pending' };
}

export async function getSignatureStatus(requestId: string) {
  return { status: 'pending', signedAt: null };
}

export async function cancelSignatureRequest(requestId: string) {
  return { success: true };
}

export async function resendSignatureRequest(requestId: string) {
  return { success: true };
}

export async function getEmbeddedSigningUrl(requestId: string, signerId: string) {
  return 'https://example.com/sign';
}

export function isESignatureAvailable() {
  return false;
}

// Self-hosted e-signature stubs
export async function createSignatureRequest(documentId: string, signers: string[]) {
  return { id: 'stub', status: 'pending' };
}

export async function verifyDocumentIntegrity(documentId: string) {
  return { valid: true };
}

export async function getAuditTrail(requestId: string) {
  return [];
}

export async function sendReminder(requestId: string) {
  return { success: true };
}

export async function cancelSelfHostedSignature(requestId: string) {
  return { success: true };
}
