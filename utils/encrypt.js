// utils/encrypt.js
/**
 * AES-256-GCM encryption utilities.
 *
 * ENCRYPTION_KEY in .env must be a Base64-encoded 32-byte key (44 chars).
 * Generate one with Node.js:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Format stored in DB column (TEXT):
 *   base64( iv[12] | authTag[16] | ciphertext[n] )
 */
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is not set');
  // Accept both hex (64 chars) and base64 (44 chars) encoded keys
  const buf = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error(`ENCRYPTION_KEY must be 32 bytes; got ${buf.length}`);
  return buf;
}

export function encrypt(plainText) {
  if (!plainText) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Layout: iv(12) | authTag(16) | ciphertext(n)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(base64) {
  if (!base64) return null;
  const key = getKey();
  const data = Buffer.from(base64, 'base64');
  const iv = data.slice(0, 12);
  const authTag = data.slice(12, 28);
  const ciphertext = data.slice(28);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
