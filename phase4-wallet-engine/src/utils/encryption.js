import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

const getEncryptionKey = () => {
  const masterKey = String(process.env.MASTER_ENCRYPTION_KEY || '').trim();
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY is required');
  }

  return crypto.createHash('sha256').update(masterKey, 'utf8').digest();
};

const assertHex = (value, fieldName) => {
  if (!value || value.length % 2 !== 0 || !HEX_PATTERN.test(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

export const encrypt = (text) => {
  if (text === undefined || text === null) {
    throw new Error('Text is required for encryption');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (payload) => {
  const input = String(payload || '').trim();
  if (!input) {
    throw new Error('Encrypted payload is required');
  }

  const parts = input.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, encryptedHex] = parts;
  assertHex(ivHex, 'IV');
  assertHex(encryptedHex, 'ciphertext');

  const iv = Buffer.from(ivHex, 'hex');
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }

  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
};
