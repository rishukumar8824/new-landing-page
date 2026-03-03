import { AppError } from '../utils/appError.js';

const TWO_FA_ISSUER = String(process.env.TWO_FA_ISSUER || 'Bitegit').trim() || 'Bitegit';

const loadSpeakeasy = async () => {
  try {
    const mod = await import('speakeasy');
    return mod.default || mod;
  } catch (error) {
    throw new AppError('speakeasy package is required for 2FA support', 500, {
      hint: 'Install dependency: npm install speakeasy'
    });
  }
};

const loadQRCode = async () => {
  try {
    const mod = await import('qrcode');
    return mod.default || mod;
  } catch (error) {
    throw new AppError('qrcode package is required for 2FA support', 500, {
      hint: 'Install dependency: npm install qrcode'
    });
  }
};

export const generate2FASecret = async (userEmail) => {
  const email = String(userEmail || '').trim().toLowerCase();
  if (!email) {
    throw new AppError('userEmail is required', 422);
  }

  const speakeasy = await loadSpeakeasy();
  const secret = speakeasy.generateSecret({
    name: `${TWO_FA_ISSUER}:${email}`,
    issuer: TWO_FA_ISSUER,
    length: 20
  });

  return {
    ascii: secret.ascii,
    hex: secret.hex,
    base32: secret.base32,
    otpauth_url: secret.otpauth_url
  };
};

export const verify2FA = async (token, secret) => {
  const normalizedToken = String(token || '').replace(/\s+/g, '');
  const normalizedSecret = String(secret || '').replace(/\s+/g, '').toUpperCase();

  if (!/^\d{6}$/.test(normalizedToken)) {
    throw new AppError('Invalid 2FA token format', 422);
  }
  if (!normalizedSecret) {
    throw new AppError('2FA secret is required', 422);
  }

  const speakeasy = await loadSpeakeasy();
  return speakeasy.totp.verify({
    secret: normalizedSecret,
    encoding: 'base32',
    token: normalizedToken,
    window: 1
  });
};

export const generateQRCode = async (otpauthUrl) => {
  const url = String(otpauthUrl || '').trim();
  if (!url) {
    throw new AppError('otpauth_url is required', 422);
  }

  const qrcode = await loadQRCode();
  return qrcode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 260
  });
};

export default {
  generate2FASecret,
  verify2FA,
  generateQRCode
};
