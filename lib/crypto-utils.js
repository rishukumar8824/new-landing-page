'use strict';

/**
 * Shared encryption/decryption utilities for Bitegit.
 * Used for encrypting sensitive data like KYC images at rest.
 */

const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_IV_LENGTH = 16;

function getMasterEncryptionKey() {
  const masterKey = String(process.env.MASTER_ENCRYPTION_KEY || process.env.JWT_SECRET || '').trim();
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY or JWT_SECRET is required');
  }
  return crypto.createHash('sha256').update(masterKey, 'utf8').digest();
}

function encryptText(plainText) {
  if (plainText === undefined || plainText === null) {
    throw new Error('Text is required for encryption');
  }

  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getMasterEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(payload) {
  const raw = String(payload || '').trim();
  if (!raw) {
    throw new Error('Encrypted payload is required');
  }

  const parts = raw.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, encryptedHex] = parts;
  if (!/^[0-9a-fA-F]+$/.test(ivHex) || ivHex.length !== ENCRYPTION_IV_LENGTH * 2) {
    throw new Error('Invalid IV format');
  }
  if (!/^[0-9a-fA-F]+$/.test(encryptedHex) || encryptedHex.length === 0 || encryptedHex.length % 2 !== 0) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getMasterEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  encryptText,
  decryptText
};
