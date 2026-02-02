const crypto = require('crypto');
const logger = require('./logger');

const ALGORITHM = 'aes-256-gcm';

let KEY = null;
let encryptionAvailable = false;

if (process.env.ENCRYPTION_KEY) {
  try {
    KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (KEY.length !== 32) {
      logger.warn('ENCRYPTION_KEY must be 64 hex chars (32 bytes). Encryption disabled — tokens stored in plaintext.');
      KEY = null;
    } else {
      encryptionAvailable = true;
    }
  } catch (err) {
    logger.warn('Invalid ENCRYPTION_KEY format. Encryption disabled — tokens stored in plaintext.');
  }
} else {
  logger.warn('ENCRYPTION_KEY not set. Google Calendar tokens will be stored in plaintext. Set a 64-char hex key in production.');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns iv:tag:ciphertext (hex-encoded).
 * Falls back to plaintext if ENCRYPTION_KEY is not configured.
 */
function encrypt(text) {
  if (!encryptionAvailable) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an AES-256-GCM encrypted string (iv:tag:ciphertext).
 * If the data doesn't look encrypted (no colons), returns it as-is (plaintext fallback).
 */
function decrypt(data) {
  if (!encryptionAvailable) return data;

  // If data doesn't contain the expected format, it's likely plaintext (pre-encryption migration)
  const parts = data.split(':');
  if (parts.length !== 3) return data;

  try {
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, data may be plaintext from before encryption was enabled
    logger.warn('Decryption failed, returning data as-is (may be pre-encryption plaintext)');
    return data;
  }
}

module.exports = { encrypt, decrypt };
