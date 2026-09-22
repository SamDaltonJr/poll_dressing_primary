/** Hex-encoded SHA-256 of a UTF-8 string, via WebCrypto. */
export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Coordinator doc ID for a login code. Codes are case-insensitive. */
export function coordinatorIdForCode(campaignId: string, code: string): Promise<string> {
  return sha256(`${campaignId}:${code.trim().toUpperCase()}`);
}

/**
 * Short, stable, non-cryptographic hash (FNV-1a 32-bit, base36). Used to derive
 * polling location IDs from normalized addresses.
 */
export function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Random code from an unambiguous alphabet (no 0/O/1/I/L), for coordinator logins. */
export function randomCode(length = 12): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
