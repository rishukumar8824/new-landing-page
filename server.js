require('dotenv').config();

const crypto = require('crypto');
const { localFaceMatch } = require('./services/local-face-match');
const express = require('express');
const path = require('path');
const { connectToMongo, getCollections, getMongoClient, getMongoConfig, isDbConnected } = require('./lib/db');
const { createRepositories } = require('./lib/repositories');
const { createWalletService } = require('./lib/wallet-service');
const { createAuthMiddleware } = require('./middleware/auth');
const { applySecurityHardening } = require('./middleware/security');
const { sanitizeRequestPayload, validateRequest, validationRules } = require('./middleware/validation');
const { apiNotFoundHandler, errorHandler } = require('./middleware/error-handler');
const { registerAuthRoutes } = require('./routes/auth');
const { registerP2POrderRoutes } = require('./routes/p2p-orders');
const { createAuditLogService } = require('./services/audit-log-service');
const { createP2POrderExpiryService } = require('./services/p2p-order-expiry-service');
const { createAuthEmailService } = require('./services/auth-email-service');
const { createP2PEmailService } = require('./services/p2p-email-service');
const tokenService = require('./services/tokenService');
const { readAuthOtpConfig } = require('./modules/auth-otp/config');
const { createMySqlAuthStore } = require('./modules/auth-otp/mysql-store');
const { createGeetestService } = require('./modules/auth-otp/geetest-service');
const { createOtpEmailService } = require('./modules/auth-otp/email-service');
const { createOtpAuthService } = require('./modules/auth-otp/otp-service');
const { createRepoFallbackOtpAuthService } = require('./modules/auth-otp/repo-fallback-service');
const { registerOtpAuthRoutes } = require('./routes/otp-auth');
const { readUserCenterConfig } = require('./modules/user-center/config');
const { createUserCenterStore } = require('./modules/user-center/mysql-store');
const { createUserCenterService } = require('./modules/user-center/service');
const { registerUserCenterRoutes } = require('./routes/user-center');
const { readSocialFeedConfig } = require('./modules/social-feed/config');
const { createSocialFeedStore } = require('./modules/social-feed/mysql-store');
const { createSocialFeedFallbackStore } = require('./modules/social-feed/fallback-store');
const { createSocialFeedService } = require('./modules/social-feed/service');
const { registerSocialFeedRoutes } = require('./routes/social-feed');
const { createP2POrderController } = require('./controllers/p2p-order-controller');
const { createAdminStore } = require('./admin/services/admin-store');
const { createAdminExtendedStore } = require('./admin/services/admin-extended-store');
const { createAdminAuthMiddleware } = require('./admin/middleware/admin-auth');
const { createAdminControllers } = require('./admin/controllers/admin-controller');
const { registerAdminRoutes } = require('./admin/routes/admin-routes');
const { registerAdminExtendedRoutes } = require('./admin/routes/admin-extended-routes');

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
app.set('trust proxy', 1);

const ADMIN_SEED_USERNAME = String(process.env.ADMIN_USERNAME || 'admin')
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'admin123').trim();
const ADMIN_SEED_EMAIL = String(process.env.ADMIN_EMAIL || `${ADMIN_SEED_USERNAME || 'admin'}@admin.local`)
  .trim()
  .toLowerCase();
const ADMIN_SEED_ROLE = String(process.env.ADMIN_ROLE || 'SUPER_ADMIN')
  .trim()
  .toUpperCase();
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ADMIN_ACCESS_COOKIE_NAME = 'admin_access_token';
const ADMIN_REFRESH_COOKIE_NAME = 'admin_refresh_token';

const P2P_USER_COOKIE_NAME = 'p2p_user_session';
const P2P_USER_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const P2P_ACCESS_COOKIE_NAME = 'p2p_access_token';
const P2P_REFRESH_COOKIE_NAME = 'p2p_refresh_token';
const P2P_ORDER_TTL_MS = 1000 * 60 * 15;
const P2P_EXPIRY_SWEEP_INTERVAL_MS = 30 * 1000;
const MERCHANT_ACTIVATION_DEPOSIT = 200;
const SIGNUP_OTP_TTL_MS = Math.max(
  60 * 1000,
  Number.parseInt(String(process.env.SIGNUP_OTP_TTL_MS || '600000'), 10) || 600000
);
const P2P_ORDER_ACTIVE_STATUSES = ['CREATED', 'PENDING', 'PAID', 'PAYMENT_SENT', 'DISPUTED'];
const IS_PRODUCTION = String(process.env.NODE_ENV || '')
  .trim()
  .toLowerCase() === 'production';
const ENABLE_DEV_TEST_ROUTES = String(process.env.ENABLE_DEV_TEST_ROUTES || '')
  .trim()
  .toLowerCase() === 'true' && !IS_PRODUCTION;

const p2pOrderStreams = new Map();
// Per-user SSE streams: userId → Set of res objects
const p2pUserStreams = new Map();
function getUserStreams(userId) {
  if (!p2pUserStreams.has(userId)) p2pUserStreams.set(userId, new Set());
  return p2pUserStreams.get(userId);
}
function broadcastUserEvent(userId, eventName, payload) {
  const streams = p2pUserStreams.get(userId);
  if (!streams || streams.size === 0) return;
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const stream of streams) stream.write(data);
}
const DEFAULT_TICKER_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
const DEFAULT_SYMBOL_PRICES = {
  BTCUSDT: 63000,
  ETHUSDT: 3200,
  BNBUSDT: 590,
  XRPUSDT: 0.62,
  SOLUSDT: 145,
  ADAUSDT: 0.78
};

const KYC_ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const KYC_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const KYC_FACE_MATCH_THRESHOLD = Math.max(
  1,
  Math.min(100, Number.parseFloat(String(process.env.KYC_FACE_MATCH_THRESHOLD || '82')) || 82)
);

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


const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'leads.json');

let repos = null;
let walletService = null;
let authMiddleware = null;
let adminStore = null;
let adminAuthMiddleware = null;
let adminControllers = null;
let auditLogService = null;
let p2pOrderExpiryService = null;
let p2pOrderController = null;
let authEmailService = null;
let p2pEmailService = null;
let otpAuthStore = null;
let otpAuthService = null;
let userCenterStore = null;
let userCenterService = null;
let socialFeedStore = null;
let socialFeedService = null;
let persistenceReady = false;
let httpServer = null;
let shuttingDown = false;
let bootRetryTimer = null;
let p2pExpirySweepTimer = null;
const socialFeedBootstrapConfig = readSocialFeedConfig();
const socialFeedBootstrapStore = createSocialFeedFallbackStore();
const socialFeedBootstrapInitPromise = socialFeedBootstrapStore
  .initialize()
  .catch((error) => {
    console.error(
      '[social-feed] Failed to initialize bootstrap fallback store:',
      error?.message || error
    );
  });
const socialFeedBootstrapService = createSocialFeedService({
  store: socialFeedBootstrapStore,
  config: socialFeedBootstrapConfig.app
});

const validation = validationRules();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(sanitizeRequestPayload);
applySecurityHardening(app);
app.use('/downloads', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: function(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

function readLeads() {
  if (!repos) {
    throw new Error('Persistence layer not initialized');
  }
  return repos.getLeadsLatest();
}

function validateStartupConfig() {
  const missing = [];
  const parsedPort = Number(PORT);
  const isProductionEnv = String(process.env.NODE_ENV || '')
    .trim()
    .toLowerCase() === 'production';

  if (!String(process.env.MONGO_URI || process.env.MONGODB_URI || '').trim()) {
    missing.push('MONGO_URI or MONGODB_URI');
  }
  if (!String(process.env.JWT_SECRET || '').trim()) {
    missing.push('JWT_SECRET');
  }
  if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
    missing.push('PORT');
  }
  if (isProductionEnv && !String(process.env.ADMIN_USERNAME || '').trim()) {
    missing.push('ADMIN_USERNAME');
  }
  if (isProductionEnv && !String(process.env.ADMIN_PASSWORD || '').trim()) {
    missing.push('ADMIN_PASSWORD');
  }
  if (isProductionEnv && String(process.env.ADMIN_PASSWORD || '').trim().length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters in production.');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Configure them in .env file.`);
  }
}

function logEmailProviderRuntimeEnv() {
  const effectiveResendApiKey = String(process.env.RESEND_API_KEY || process.env.RESEND || '').trim();
  const effectiveResendFromEmail = String(
    process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM || process.env.SMTP_FROM_EMAIL || ''
  ).trim();
  const effectiveSmtpHost = String(process.env.SMTP_HOST || '').trim();
  const effectiveSmtpUser = String(process.env.SMTP_USER || '').trim();
  const effectiveSmtpPass = String(process.env.SMTP_PASS || '').trim();
  const effectiveGmailUser = String(process.env.GMAIL_USER || '').trim();
  const effectiveGmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').trim();

  let effectiveProvider = 'none';
  if (effectiveResendApiKey && effectiveResendFromEmail) {
    effectiveProvider = 'resend';
  } else if (effectiveSmtpHost && effectiveSmtpUser && effectiveSmtpPass) {
    effectiveProvider = 'smtp';
  } else if (effectiveGmailUser && effectiveGmailAppPassword) {
    effectiveProvider = 'gmail';
  }

  console.log('Email provider env status:', {
    nodeEnv: String(process.env.NODE_ENV || 'development'),
    hasResendApiKey: Boolean(String(process.env.RESEND_API_KEY || '').trim()),
    hasResendAliasKey: Boolean(String(process.env.RESEND || '').trim()),
    hasResendFromEmail: Boolean(String(process.env.RESEND_FROM_EMAIL || '').trim()),
    hasMailFromAlias: Boolean(String(process.env.MAIL_FROM || '').trim()),
    hasEffectiveResendApiKey: Boolean(effectiveResendApiKey),
    hasEffectiveResendFromEmail: Boolean(effectiveResendFromEmail),
    hasSmtpHost: Boolean(String(process.env.SMTP_HOST || '').trim()),
    hasSmtpUser: Boolean(String(process.env.SMTP_USER || '').trim()),
    hasSmtpPass: Boolean(String(process.env.SMTP_PASS || '').trim()),
    hasSmtpFromEmail: Boolean(String(process.env.SMTP_FROM_EMAIL || '').trim()),
    hasGmailUser: Boolean(String(process.env.GMAIL_USER || '').trim()),
    hasGmailAppPassword: Boolean(String(process.env.GMAIL_APP_PASSWORD || '').trim()),
    effectiveProvider
  });
}

function saveLeadRecord(name, contact, extra = {}) {
  if (!repos) {
    throw new Error('Persistence layer not initialized');
  }
  return repos.saveLeadRecord(name, contact, extra);
}

function normalizeMarketSymbol(rawSymbol) {
  const symbol = String(rawSymbol || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{5,12}$/.test(symbol)) {
    return 'BTCUSDT';
  }
  return symbol;
}

function normalizeUsdtNetwork(rawNetwork) {
  const normalized = String(rawNetwork || '')
    .trim()
    .toUpperCase();
  if (['TRC20', 'ERC20', 'BEP20'].includes(normalized)) {
    return normalized;
  }
  return 'TRC20';
}

function isValidAddressForNetwork(address, network) {
  const rawAddress = String(address || '').trim();
  if (!rawAddress) {
    return false;
  }

  const normalizedNetwork = normalizeUsdtNetwork(network);
  if (normalizedNetwork === 'TRC20') {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(rawAddress);
  }

  return /^0x[a-fA-F0-9]{40}$/.test(rawAddress);
}

async function getUsdtDepositConfigForUser() {
  const fallbackNetworks = [
    {
      network: 'TRC20',
      address: String(process.env.USDT_TRC20_DEPOSIT_ADDRESS || '').trim(),
      minConfirmations: 20
    },
    {
      network: 'ERC20',
      address: String(process.env.USDT_ERC20_DEPOSIT_ADDRESS || '').trim(),
      minConfirmations: 12
    },
    {
      network: 'BEP20',
      address: String(process.env.USDT_BEP20_DEPOSIT_ADDRESS || '').trim(),
      minConfirmations: 15
    }
  ];
  const fallbackDefaultNetwork = normalizeUsdtNetwork(process.env.USDT_DEFAULT_NETWORK || 'TRC20');

  let config = null;
  if (adminStore && typeof adminStore.getUserDepositConfig === 'function') {
    try {
      config = await adminStore.getUserDepositConfig('USDT');
    } catch (error) {
      config = null;
    }
  }

  const defaultNetwork = normalizeUsdtNetwork(config?.defaultNetwork || fallbackDefaultNetwork);
  const rawNetworks = Array.isArray(config?.networks) ? config.networks : fallbackNetworks;

  const networks = rawNetworks
    .map((item) => {
      const network = normalizeUsdtNetwork(item?.network || item?.chain || item?.name || item);
      const address = String(item?.address || '').trim();
      const minConfirmations = Math.max(1, Number.parseInt(String(item?.minConfirmations || item?.confirmations || 1), 10) || 1);
      const enabled = item?.enabled !== undefined ? Boolean(item.enabled) : Boolean(address);
      const qrCodeUrl = String(item?.qrCodeUrl || item?.qrUrl || item?.qr || '').trim();
      return { network, address, minConfirmations, enabled, qrCodeUrl };
    })
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.network === item.network) === index);

  const activeNetwork =
    networks.find((item) => item.network === defaultNetwork && item.enabled && item.address) ||
    networks.find((item) => item.enabled && item.address) || {
      network: defaultNetwork,
      address: '',
      minConfirmations: 1,
      enabled: false
    };

  const depositsEnabled = config?.depositsEnabled !== undefined ? Boolean(config.depositsEnabled) : true;

  return {
    coin: 'USDT',
    token: 'USDT',
    depositsEnabled,
    defaultNetwork,
    networks,
    activeNetwork,
    depositAddress: activeNetwork.address || ''
  };
}

async function getDepositWalletCatalogForUser() {
  const fallbackUsdtConfig = await getUsdtDepositConfigForUser();

  if (!adminStore || typeof adminStore.listUserDepositWalletCatalog !== 'function') {
    return [fallbackUsdtConfig];
  }

  try {
    const rows = await adminStore.listUserDepositWalletCatalog();
    if (!Array.isArray(rows) || rows.length === 0) {
      return [fallbackUsdtConfig];
    }

    const normalized = rows
      .map((item) => {
        const coin = String(item?.coin || '').trim().toUpperCase();
        if (!coin) {
          return null;
        }
        const networks = (Array.isArray(item?.networks) ? item.networks : [])
          .map((networkItem) => ({
            network: String(networkItem?.network || '').trim().toUpperCase(),
            address: String(networkItem?.address || '').trim(),
            minConfirmations: Math.max(1, Number.parseInt(String(networkItem?.minConfirmations || 1), 10) || 1),
            enabled: networkItem?.enabled !== false,
            qrCodeUrl: String(networkItem?.qrCodeUrl || '').trim()
          }))
          .filter((networkItem) => Boolean(networkItem.network))
          .filter((networkItem) => networkItem.enabled && Boolean(networkItem.address));

        if (networks.length === 0) {
          return null;
        }

        const defaultNetwork = String(item?.defaultNetwork || '').trim().toUpperCase() || networks[0].network;
        const activeNetwork =
          networks.find((networkItem) => networkItem.network === defaultNetwork && networkItem.enabled && networkItem.address) ||
          networks.find((networkItem) => networkItem.enabled && networkItem.address) ||
          networks[0];

        return {
          coin,
          token: coin,
          depositsEnabled: item?.depositsEnabled !== false,
          defaultNetwork,
          networks,
          activeNetwork,
          depositAddress: String(activeNetwork?.address || '').trim()
        };
      })
      .filter(Boolean);

    if (normalized.length === 0) {
      return [fallbackUsdtConfig];
    }

    if (!normalized.some((item) => item.coin === 'USDT')) {
      normalized.unshift(fallbackUsdtConfig);
    }

    return normalized;
  } catch (error) {
    return [fallbackUsdtConfig];
  }
}

function normalizeKycStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toUpperCase();
  if (['NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'].includes(normalized)) {
    return normalized;
  }
  return 'NOT_SUBMITTED';
}

function getKycStatusLabel(status) {
  const normalized = normalizeKycStatus(status);
  if (normalized === 'VERIFIED') {
    return 'Verified';
  }
  if (normalized === 'PENDING_REVIEW') {
    return 'Pending Review';
  }
  if (normalized === 'REJECTED') {
    return 'Rejected';
  }
  return 'Not Submitted';
}

function normalizeAadhaarNumber(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');
  if (!/^\d{12}$/.test(digits)) {
    throw new Error('Enter a valid 12-digit Aadhaar number.');
  }
  return digits;
}

function maskAadhaar(aadhaarDigits) {
  const digits = String(aadhaarDigits || '').replace(/\D/g, '');
  if (digits.length < 4) {
    return 'XXXXXXXXXXXX';
  }
  return `XXXXXXXX${digits.slice(-4)}`;
}

function hashSensitive(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function extractKycImageData(rawInput, fieldLabel) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    throw new Error(`${fieldLabel} image is required.`);
  }

  const matched = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!matched) {
    throw new Error(`${fieldLabel} must be a valid base64 image.`);
  }

  const mimeType = String(matched[1] || '').trim().toLowerCase();
  const base64Payload = String(matched[2] || '').replace(/\s/g, '');
  if (!KYC_ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error(`${fieldLabel} image type is not supported.`);
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error(`${fieldLabel} image data is invalid.`);
  }
  if (buffer.length > KYC_MAX_IMAGE_BYTES) {
    throw new Error(`${fieldLabel} image must be 5MB or smaller.`);
  }

  return {
    dataUrl: `data:${mimeType};base64,${base64Payload}`,
    mimeType,
    sizeBytes: buffer.length,
    sha256: hashSensitive(buffer.toString('base64'))
  };
}

function createKycRequestId() {
  return `kyc_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
}

async function runKycFaceMatch({ aadhaarFrontImage, selfieWithDocumentImage }) {
  const endpoint = String(process.env.KYC_FACE_MATCH_ENDPOINT || '').trim();
  const apiKey = String(process.env.KYC_FACE_MATCH_API_KEY || '').trim();
  const timeoutMs = Math.max(3000, Number.parseInt(String(process.env.KYC_FACE_MATCH_TIMEOUT_MS || '12000'), 10) || 12000);

  // ── Local face match (no external API needed) ──────────────────────────────
  if (!endpoint) {
    try {
      const result = await localFaceMatch(
        aadhaarFrontImage.dataUrl,
        selfieWithDocumentImage.dataUrl,
        KYC_FACE_MATCH_THRESHOLD
      );
      console.log(`[KYC local-face-match] score=${result.score} passed=${result.passed} reason=${result.reason}`);
      return {
        provider: 'local',
        available: true,
        passed: result.passed,
        score: result.score,
        reason: result.reason
      };
    } catch (localErr) {
      console.error('[KYC local-face-match error]', localErr?.message);
      return {
        provider: 'local',
        available: false,
        passed: false,
        score: null,
        reason: String(localErr?.message || 'local_face_match_failed')
      };
    }
  }

  // ── External API face match ────────────────────────────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        documentImage: aadhaarFrontImage.dataUrl,
        selfieImage: selfieWithDocumentImage.dataUrl
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        provider: 'external',
        available: false,
        passed: false,
        score: null,
        reason: String(payload?.message || `face_match_http_${response.status}`)
      };
    }

    const scoreRaw = Number(payload?.score ?? payload?.similarity ?? payload?.confidence ?? NaN);
    const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, scoreRaw)) : null;
    const passedByProvider = payload?.passed === true || payload?.match === true;
    const passedByThreshold = score !== null ? score >= KYC_FACE_MATCH_THRESHOLD : false;

    return {
      provider: String(payload?.provider || 'external').trim().toLowerCase() || 'external',
      available: true,
      passed: Boolean(passedByProvider || passedByThreshold),
      score,
      reason: passedByProvider || passedByThreshold ? '' : 'face_similarity_below_threshold'
    };
  } catch (error) {
    return {
      provider: 'external',
      available: false,
      passed: false,
      score: null,
      reason: String(error?.name === 'AbortError' ? 'face_match_timeout' : error?.message || 'face_match_failed')
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildP2PKycProfileFromCredential(credential = {}) {
  const status = normalizeKycStatus(credential?.kycStatus);
  return {
    status,
    statusLabel: getKycStatusLabel(status),
    canBuy: status === 'VERIFIED',
    level: String(credential?.kycLevel || 'BASIC').trim().toUpperCase() || 'BASIC',
    aadhaarLast4: String(credential?.kycAadhaarLast4 || '').trim(),
    requestId: String(credential?.kycRequestId || '').trim(),
    updatedAt: credential?.kycUpdatedAt ? new Date(credential.kycUpdatedAt).toISOString() : null,
    verifiedAt: credential?.kycVerifiedAt ? new Date(credential.kycVerifiedAt).toISOString() : null,
    rejectedAt: credential?.kycRejectedAt ? new Date(credential.kycRejectedAt).toISOString() : null,
    rejectionReason: String(credential?.kycRejectionReason || credential?.kycRemarks || '').trim()
  };
}

async function getP2PKycProfileByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !repos || typeof repos.getP2PCredential !== 'function') {
    return buildP2PKycProfileFromCredential();
  }
  const credential = await repos.getP2PCredential(normalizedEmail);
  return buildP2PKycProfileFromCredential(credential || {});
}

function createFallbackOrderBook(symbol) {
  const basePrice = DEFAULT_SYMBOL_PRICES[symbol] || 100;
  const asks = [];
  const bids = [];
  const trades = [];
  const now = Date.now();

  for (let i = 0; i < 10; i += 1) {
    const askPrice = Number((basePrice + i * (basePrice * 0.00045 + 0.01)).toFixed(6));
    const bidPrice = Number((basePrice - i * (basePrice * 0.00045 + 0.01)).toFixed(6));
    const askQty = Number((0.6 + i * 0.21).toFixed(5));
    const bidQty = Number((0.65 + i * 0.19).toFixed(5));

    asks.push({
      price: askPrice,
      quantity: askQty,
      total: Number((askPrice * askQty).toFixed(2))
    });
    bids.push({
      price: bidPrice,
      quantity: bidQty,
      total: Number((bidPrice * bidQty).toFixed(2))
    });
  }

  for (let i = 0; i < 18; i += 1) {
    const side = i % 2 === 0 ? 'buy' : 'sell';
    const drift = (Math.random() - 0.5) * basePrice * 0.0012;
    const price = Number((basePrice + drift).toFixed(6));
    const quantity = Number((Math.random() * 1.2 + 0.05).toFixed(5));
    trades.push({
      id: `fallback_${i}`,
      price,
      quantity,
      side,
      time: now - i * 25000
    });
  }

  return {
    source: 'fallback',
    symbol,
    updatedAt: new Date().toISOString(),
    ticker: {
      lastPrice: basePrice,
      change24h: 0,
      high24h: Number((basePrice * 1.02).toFixed(6)),
      low24h: Number((basePrice * 0.98).toFixed(6)),
      volume24h: Number((basePrice * 500).toFixed(2))
    },
    orderBook: { asks, bids },
    trades
  };
}

const KLINE_INTERVAL_MS = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000
};

function normalizeKlineInterval(rawInterval) {
  const interval = String(rawInterval || '')
    .trim()
    .toLowerCase();
  if (KLINE_INTERVAL_MS[interval]) {
    return interval;
  }
  return '15m';
}

function normalizeKlineLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed)) {
    return 120;
  }
  return Math.min(Math.max(parsed, 20), 500);
}

function createFallbackKlines(symbol, interval = '15m', limit = 120) {
  const intervalMs = KLINE_INTERVAL_MS[interval] || KLINE_INTERVAL_MS['15m'];
  const safeLimit = normalizeKlineLimit(limit);
  const basePrice = DEFAULT_SYMBOL_PRICES[symbol] || 100;
  const startTime = Date.now() - safeLimit * intervalMs;
  const klines = [];

  let prevClose = basePrice * (0.98 + Math.random() * 0.04);
  for (let i = 0; i < safeLimit; i += 1) {
    const openTime = startTime + i * intervalMs;
    const open = prevClose;
    const drift = (Math.sin(i / 7) + (Math.random() - 0.5) * 0.65) * basePrice * 0.0013;
    const close = Math.max(0.000001, open + drift);
    const high = Math.max(open, close) + Math.abs(drift) * 0.85 + basePrice * 0.00035;
    const low = Math.max(0.000001, Math.min(open, close) - Math.abs(drift) * 0.85 - basePrice * 0.00035);
    const volume = Math.abs(drift) * 2800 + basePrice * (0.08 + Math.random() * 0.2);

    klines.push({
      openTime,
      closeTime: openTime + intervalMs - 1,
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: Number(volume.toFixed(4))
    });

    prevClose = close;
  }

  return {
    source: 'fallback',
    symbol,
    interval,
    klines
  };
}

function createStableSymbolDrift(symbol, minuteBucket = Math.floor(Date.now() / 60000)) {
  const seed = String(symbol || '')
    .split('')
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  const wave = Math.sin((minuteBucket + seed) / 13);
  const micro = ((seed % 17) - 8) * 0.04;
  return wave * 0.9 + micro;
}

function createFallbackTickerSnapshot(symbols) {
  const safeSymbols = Array.isArray(symbols) && symbols.length ? symbols : DEFAULT_TICKER_SYMBOLS;
  const nowBucket = Math.floor(Date.now() / 60000);

  return safeSymbols.map((symbol) => {
    const refPrice = DEFAULT_SYMBOL_PRICES[symbol] || 100;
    const driftPercent = createStableSymbolDrift(symbol, nowBucket);
    const priceFactor = 1 + driftPercent / 100;
    const lastPrice = Number((refPrice * priceFactor).toFixed(6));

    return {
      symbol,
      lastPrice,
      change24h: Number(driftPercent.toFixed(2))
    };
  });
}

function normalizeTradeSide(rawSide) {
  return String(rawSide || '').trim().toLowerCase() === 'sell' ? 'sell' : 'buy';
}

function normalizeTradeAmount(rawAmount) {
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Number(amount.toFixed(2));
}

function normalizeSignupContact(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return { type: 'email', value: raw.toLowerCase() };
  }
  if (/^\d{10}$/.test(digits)) {
    return { type: 'phone', value: digits };
  }
  return null;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function trySendSignupEmailOtp(email, code) {
  if (!authEmailService || typeof authEmailService.sendSignupOtpEmail !== 'function') {
    return { delivered: false, reason: 'missing_email_provider_config' };
  }

  try {
    const expiresInMinutes = Math.max(1, Math.floor(SIGNUP_OTP_TTL_MS / (60 * 1000)));
    return await authEmailService.sendSignupOtpEmail(email, code, { expiresInMinutes });
  } catch (error) {
    return { delivered: false, reason: `provider_error:${error.message}` };
  }
}

function parseCookies(req) {
  const rawCookie = req.headers.cookie || '';
  const parsed = {};

  for (const item of rawCookie.split(';')) {
    const [rawKey, ...rawValueParts] = item.trim().split('=');
    if (!rawKey) {
      continue;
    }
    parsed[rawKey] = decodeURIComponent(rawValueParts.join('='));
  }

  return parsed;
}

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookieValue]);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieValue]);
    return;
  }

  res.setHeader('Set-Cookie', [existing, cookieValue]);
}

function setCookie(res, key, value, maxAgeSeconds, options = {}) {
  const sameSite = options.sameSite || 'Lax';
  const pathValue = options.path || '/';
  const secure = options.secure === undefined ? IS_PRODUCTION : Boolean(options.secure);
  const httpOnly = options.httpOnly === undefined ? true : Boolean(options.httpOnly);
  const cookieParts = [
    `${key}=${encodeURIComponent(String(value || ''))}`,
    `Path=${pathValue}`,
    `Max-Age=${Math.max(0, Number(maxAgeSeconds) || 0)}`,
    `SameSite=${sameSite}`
  ];
  if (httpOnly) {
    cookieParts.push('HttpOnly');
  }
  if (secure) {
    cookieParts.push('Secure');
  }
  appendSetCookie(res, cookieParts.join('; '));
}

function clearCookie(res, key, options = {}) {
  setCookie(res, key, '', 0, options);
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createIpAttemptLimiter({ maxAttempts, windowMs }) {
  const store = new Map();
  return function checkAttempt(ipKey) {
    const key = String(ipKey || 'unknown');
    const now = Date.now();
    const existing = store.get(key);
    if (!existing || now > existing.resetAt) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true
      };
    }

    if (existing.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      };
    }

    existing.count += 1;
    store.set(key, existing);
    return {
      allowed: true
    };
  };
}

function getRequestIp(req) {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const firstForwarded = forwardedRaw.split(',')[0].trim();
  return firstForwarded || String(req.ip || req.connection?.remoteAddress || 'unknown');
}

const loginAttemptLimiter = createIpAttemptLimiter({
  maxAttempts: 100,
  windowMs: 1 * 60 * 1000
});

async function createSession() {
  const token = createToken();
  await repos.createAdminSession(token, Date.now() + SESSION_TTL_MS);
  return token;
}

async function isSessionValid(token) {
  if (!token) {
    return false;
  }

  const session = await repos.getAdminSession(token);
  if (!session || !session.expiresAt) {
    return false;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await repos.deleteAdminSession(token);
    return false;
  }

  await repos.refreshAdminSession(token, Date.now() + SESSION_TTL_MS);
  return true;
}

async function requiresAdminSession(req, res, next) {
  if (authMiddleware) {
    return authMiddleware.requireAdmin({ allowLegacy: true })(req, res, next);
  }
  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];

    if (!(await isSessionValid(token))) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error while validating admin session.' });
  }
}

function isLegacyAdminIdentifier(identifier) {
  const normalized = String(identifier || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === ADMIN_SEED_EMAIL) {
    return true;
  }
  if (normalized === ADMIN_SEED_USERNAME) {
    return true;
  }
  return normalized === `${ADMIN_SEED_USERNAME}@admin.local`;
}

async function handleLegacyAdminLogin(req, res) {
  const ipAddress = getRequestIp(req);
  const limiter = loginAttemptLimiter(`admin_legacy_login:${ipAddress}`);
  if (!limiter.allowed) {
    res.setHeader('Retry-After', String(limiter.retryAfterSeconds));
    return res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
      retryAfterSeconds: limiter.retryAfterSeconds
    });
  }

  const identifier = String(req.body?.email || req.body?.username || req.body?.identifier || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Admin email/username and password are required.' });
  }

  if (!repos) {
    return res.status(503).json({ message: 'Admin service is initializing. Please try again.' });
  }

  if (!isLegacyAdminIdentifier(identifier) || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid login credentials.' });
  }

  const sessionToken = await createSession();
  setCookie(res, SESSION_COOKIE_NAME, sessionToken, Math.floor(SESSION_TTL_MS / 1000), {
    sameSite: 'Lax',
    secure: IS_PRODUCTION,
    httpOnly: true
  });

  return res.json({
    message: 'Admin login successful.',
    admin: {
      id: 'admin_legacy',
      username: ADMIN_SEED_USERNAME,
      email: ADMIN_SEED_EMAIL,
      role: ADMIN_SEED_ROLE,
      status: 'ACTIVE'
    },
    legacySession: true
  });
}

// Keep admin login available even if modular admin routes are delayed (e.g. external DB module timeouts).
app.post('/api/admin/auth/login', async (req, res, next) => {
  if (adminControllers && adminAuthMiddleware) {
    return next();
  }
  return handleLegacyAdminLogin(req, res);
});

app.post('/api/admin/login', async (req, res, next) => {
  if (adminControllers && adminAuthMiddleware) {
    return next();
  }
  return handleLegacyAdminLogin(req, res);
});

function buildP2PUserFromEmail(email, role = 'USER') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const baseName = normalizedEmail.split('@')[0] || 'trader';
  const username = baseName.replace(/[^a-z0-9_]/gi, '_').slice(0, 20) || 'trader';
  const userHash = crypto.createHash('sha1').update(normalizedEmail).digest('hex').slice(0, 16);
  return {
    id: `usr_${userHash}`,
    username,
    email: normalizedEmail,
    role: tokenService.normalizeRole(role),
    expiresAt: Date.now() + P2P_USER_TTL_MS
  };
}

async function createP2PUserSession(email, role = 'USER') {
  const token = createToken();
  const user = buildP2PUserFromEmail(email, role);

  await repos.createP2PUserSession(token, user, user.expiresAt);
  return { token, user };
}

async function persistRefreshToken(user, refreshToken, refreshTokenExpiresAtMs) {
  await repos.saveRefreshToken({
    userId: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
    tokenHash: tokenService.hashRefreshToken(refreshToken),
    issuedAt: Date.now(),
    expiresAt: refreshTokenExpiresAtMs
  });
}

async function issueAuthTokenPairForUser(user) {
  const tokenPair = tokenService.createTokenPair(user);
  await persistRefreshToken(user, tokenPair.refreshToken, tokenPair.refreshTokenExpiresAt);
  return tokenPair;
}

function setP2PAuthCookies(res, tokenPair) {
  setCookie(res, P2P_ACCESS_COOKIE_NAME, tokenPair.accessToken, tokenService.ACCESS_TOKEN_TTL_SECONDS);
  setCookie(res, P2P_REFRESH_COOKIE_NAME, tokenPair.refreshToken, tokenService.REFRESH_TOKEN_TTL_SECONDS);
}

function clearP2PAuthCookies(res) {
  clearCookie(res, P2P_ACCESS_COOKIE_NAME);
  clearCookie(res, P2P_REFRESH_COOKIE_NAME);
}

function setAdminAuthCookies(res, tokenPair) {
  setCookie(res, ADMIN_ACCESS_COOKIE_NAME, tokenPair.accessToken, tokenService.ACCESS_TOKEN_TTL_SECONDS);
  setCookie(res, ADMIN_REFRESH_COOKIE_NAME, tokenPair.refreshToken, tokenService.REFRESH_TOKEN_TTL_SECONDS);
}

function clearAdminAuthCookies(res) {
  clearCookie(res, ADMIN_ACCESS_COOKIE_NAME);
  clearCookie(res, ADMIN_REFRESH_COOKIE_NAME);
}

async function getP2PUserFromRequest(req) {
  if (authMiddleware) {
    const accessToken = authMiddleware.extractAccessTokenFromRequest(req);
    if (accessToken) {
      try {
        const decoded = tokenService.verifyAccessToken(accessToken);
        if (String(decoded?.typ || 'access').trim().toLowerCase() === 'access' && String(decoded?.sub || '').trim()) {
          return {
            id: String(decoded.sub).trim(),
            username: String(decoded.username || '').trim(),
            email: String(decoded.email || '')
              .trim()
              .toLowerCase(),
            role: tokenService.normalizeRole(decoded.role || 'USER'),
            expiresAt: Date.now() + P2P_USER_TTL_MS
          };
        }
      } catch (error) {
        // Fall back to legacy session lookup.
      }
    }
  }

  const cookies = parseCookies(req);
  const token = cookies[P2P_USER_COOKIE_NAME];

  if (!token) {
    return null;
  }

  if (!repos) return null; // DB not ready yet

  const session = await repos.getP2PUserSession(token);
  if (!session || !session.expiresAt) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await repos.deleteP2PUserSession(token);
    return null;
  }

  const expiresAt = Date.now() + P2P_USER_TTL_MS;
  await repos.refreshP2PUserSession(token, expiresAt);

  return {
    id: session.userId,
    username: session.username,
    email: session.email,
    role: tokenService.normalizeRole(session.role || 'USER'),
    expiresAt
  };
}

async function requiresP2PUser(req, res, next) {
  if (authMiddleware) {
    return authMiddleware.requireAuth({ roles: ['USER', 'ADMIN'], allowLegacy: true })(req, res, next);
  }
  try {
    const user = await getP2PUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: 'Please login to continue.' });
    }

    req.p2pUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error while validating user session.' });
  }
}

function createOfferId() {
  return repos.nextCounterValue('p2p_offer_seq').then((sequence) => `ofr_${sequence}`);
}

function findOrderByReference(reference) {
  return repos.getP2POrderByReference(reference);
}

function getParticipantsText(order) {
  if (Array.isArray(order.participants) && order.participants.length > 0) {
    return order.participants.map((participant) => participant.username).join(', ');
  }

  const sellerName = String(order.sellerUsername || 'seller').trim();
  const buyerName = String(order.buyerUsername || 'buyer').trim();
  return `${buyerName}, ${sellerName}`;
}

function normalizeOrderState(order) {
  if (!order) {
    return null;
  }

  const remainingSeconds =
    P2P_ORDER_ACTIVE_STATUSES.includes(order.status) && Number(order.expiresAt) > Date.now()
      ? Math.max(0, Math.floor((Number(order.expiresAt) - Date.now()) / 1000))
      : 0;

  return {
    id: order.id,
    reference: order.reference,
    side: order.side,
    asset: order.asset,
    status: order.status,
    advertiser: order.advertiser,
    price: order.price,
    amountInr: order.amountInr,
    assetAmount: order.assetAmount,
    paymentMethod: order.paymentMethod || 'UPI',
    participants: order.participants,
    participantsLabel: getParticipantsText(order),
    sellerUserId: order.sellerUserId,
    sellerUsername: order.sellerUsername,
    buyerUserId: order.buyerUserId,
    buyerUsername: order.buyerUsername,
    escrowAmount: order.escrowAmount,
    isParticipant: true,
    createdAt: new Date(order.createdAt).toISOString(),
    expiresAt: new Date(order.expiresAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    remainingSeconds
  };
}

function isParticipant(order, userId) {
  if (!order || !userId) {
    return false;
  }

  if (Array.isArray(order.participants) && order.participants.some((participant) => participant.id === userId)) {
    return true;
  }

  return [order.sellerUserId, order.buyerUserId].includes(userId);
}

function addSystemMessage(order, text) {
  const now = Date.now();
  order.messages.push({
    id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
    sender: 'System',
    text,
    createdAt: now
  });
}

function toClientMessages(messages) {
  return messages.map((msg) => {
    const m = {
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      createdAt: new Date(msg.createdAt).toISOString()
    };
    if (msg.imageBase64) m.imageBase64 = msg.imageBase64;
    if (msg.role) m.role = msg.role; // 'buyer' | 'seller' | undefined=all
    return m;
  });
}

function getOrderStreams(orderId) {
  if (!p2pOrderStreams.has(orderId)) {
    p2pOrderStreams.set(orderId, new Set());
  }
  return p2pOrderStreams.get(orderId);
}

function broadcastOrderEvent(orderId, eventName, payload) {
  const streams = p2pOrderStreams.get(orderId);
  if (!streams || streams.size === 0) {
    return;
  }

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const stream of streams) {
    stream.write(data);
  }
}

function cloneOrder(order) {
  return JSON.parse(JSON.stringify(order));
}

async function withOrderMutation(orderId, mutator, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const current = await repos.getP2POrderById(orderId);
    if (!current) {
      return { error: 'not_found' };
    }

    const next = cloneOrder(current);
    const mutatorResult = mutator(next, current);
    if (mutatorResult?.error) {
      return mutatorResult;
    }

    const updated = await repos.replaceP2POrderIfVersionMatches(orderId, current.updatedAt, next);
    if (updated) {
      return { order: next, meta: mutatorResult?.meta || {} };
    }
  }

  return { error: 'conflict' };
}

app.post('/api/p2p/login', async (req, res) => {
  const requestIp = getRequestIp(req);
  const ipCheck = loginAttemptLimiter(`p2p_login:${getRequestIp(req)}`);
  if (!ipCheck.allowed) {
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: '',
        action: 'login_failed',
        ipAddress: requestIp,
        metadata: { reason: 'rate_limited', route: '/api/p2p/login' }
      });
    }
    res.setHeader('Retry-After', String(ipCheck.retryAfterSeconds));
    return res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
      retryAfterSeconds: ipCheck.retryAfterSeconds
    });
  }

  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body.password || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: '',
        action: 'login_failed',
        ipAddress: requestIp,
        metadata: { reason: 'invalid_email', route: '/api/p2p/login', email }
      });
    }
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: '',
        action: 'login_failed',
        ipAddress: requestIp,
        metadata: { reason: 'invalid_password_length', route: '/api/p2p/login', email }
      });
    }
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const existingCredential = await repos.getP2PCredential(email);
    if (existingCredential && !repos.verifyPassword(password, existingCredential.passwordHash)) {
      if (auditLogService) {
        await auditLogService.safeLog({
          userId: '',
          action: 'login_failed',
          ipAddress: requestIp,
          metadata: { reason: 'invalid_credentials', route: '/api/p2p/login', email }
        });
      }
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    let userRole = tokenService.normalizeRole(existingCredential?.role || 'USER');
    if (!existingCredential) {
      const hash = repos.hashPassword(password);
      await repos.setP2PCredential(email, hash, {
        role: 'USER'
      });
      userRole = 'USER';
    }

    const { token, user } = await createP2PUserSession(email, userRole);
    const tokenPair = await issueAuthTokenPairForUser(user);
    await walletService.ensureWallet(user.id, { username: user.username });
    setCookie(res, P2P_USER_COOKIE_NAME, token, P2P_USER_TTL_MS / 1000);
    setP2PAuthCookies(res, tokenPair);
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: user.id,
        action: 'login_success',
        ipAddress: requestIp,
        metadata: {
          route: '/api/p2p/login',
          email: user.email,
          role: user.role
        }
      });
    }

    const kycProfile = await getP2PKycProfileByEmail(user.email);

    return res.json({
      message: 'P2P login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        kyc: kycProfile
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken
    });
  } catch (error) {
    clearP2PAuthCookies(res);
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: '',
        action: 'login_failed',
        ipAddress: requestIp,
        metadata: {
          reason: 'server_error',
          route: '/api/p2p/login',
          email
        }
      });
    }
    if (String(error.message || '').includes('JWT_SECRET')) {
      return res.status(503).json({ message: 'JWT auth is not configured.' });
    }
    return res.status(500).json({ message: 'Server error while logging into P2P.' });
  }
});

app.post('/api/signup/send-code', async (req, res) => {
  const contactInfo = normalizeSignupContact(req.body.contact);
  if (!contactInfo) {
    return res.status(400).json({ message: 'Enter a valid email or 10-digit mobile number.' });
  }

  const code = createOtpCode();
  const otpState = {
    code,
    type: contactInfo.type,
    expiresAt: Date.now() + SIGNUP_OTP_TTL_MS,
    attempts: 0
  };

  await repos.upsertSignupOtp(contactInfo.value, otpState);

  let delivery = 'email';
  let deliveryMessage = 'Verification code sent to your email.';

  if (contactInfo.type === 'email') {
    const sendResult = await trySendSignupEmailOtp(contactInfo.value, code);
    if (sendResult.delivered) {
      delivery = 'email';
      deliveryMessage = 'Verification code sent to your email.';
    } else {
      await repos.deleteSignupOtp(contactInfo.value);
      const failureReason = String(sendResult.reason || 'email_provider_unavailable').trim();
      return res.status(503).json({
        message: 'Unable to send email OTP right now.',
        reason: failureReason
      });
    }
  } else {
    await repos.deleteSignupOtp(contactInfo.value);
    return res.status(503).json({
      message: 'SMS OTP service is not configured.',
      reason: 'missing_sms_provider_config'
    });
  }

  const payload = {
    message: deliveryMessage,
    contactType: contactInfo.type,
    expiresInSeconds: Math.floor(SIGNUP_OTP_TTL_MS / 1000),
    delivery
  };

  return res.json(payload);
});

app.post('/api/signup/verify-code', async (req, res) => {
  const contactInfo = normalizeSignupContact(req.body.contact);
  const code = String(req.body.code || '').trim();
  const name = String(req.body.name || 'Website Lead').trim() || 'Website Lead';

  if (!contactInfo) {
    return res.status(400).json({ message: 'Enter a valid email or 10-digit mobile number.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter a valid 6-digit verification code.' });
  }
  if (name.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  const otpState = await repos.getSignupOtp(contactInfo.value);
  if (!otpState) {
    return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
  }

  if (new Date(otpState.expiresAt).getTime() < Date.now()) {
    await repos.deleteSignupOtp(contactInfo.value);
    return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
  }

  if (otpState.code !== code) {
    const attempts = Number(otpState.attempts || 0) + 1;
    if (attempts >= 5) {
      await repos.deleteSignupOtp(contactInfo.value);
      return res.status(400).json({ message: 'Too many failed attempts. Request a new code.' });
    }
    await repos.upsertSignupOtp(contactInfo.value, {
      ...otpState,
      attempts,
      expiresAt: new Date(otpState.expiresAt).getTime()
    });
    return res.status(400).json({ message: 'Invalid verification code.' });
  }

  await repos.deleteSignupOtp(contactInfo.value);

  try {
    await saveLeadRecord(name, contactInfo.value, {
      verified: true,
      verificationMethod: contactInfo.type,
      source: 'signup_otp'
    });
    return res.status(201).json({ message: 'Signup verified successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving signup.' });
  }
});

// ===== P2P PASSWORD RESET =====
app.post('/api/p2p/forgot-password', async (req, res) => {
  if (!repos) return res.status(503).json({ message: 'Service unavailable.' });
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ message: 'Valid email required.' });
  try {
    const credential = await repos.getP2PCredential(email);
    // Always return success to avoid email enumeration
    if (credential && authEmailService) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await repos.upsertSignupOtp(email, { code, type: 'email', attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000), payload: {} }, { purpose: 'p2p_password_reset' });
      await authEmailService.sendForgotPasswordOtpEmail(email, code, { expiresInMinutes: 10 }).catch(() => {});
    }
    return res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/p2p/reset-password', async (req, res) => {
  if (!repos) return res.status(503).json({ message: 'Service unavailable.' });
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const newPassword = String(req.body.newPassword || '').trim();
  if (!email || !code || !newPassword) return res.status(400).json({ message: 'Email, code and new password required.' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  try {
    const otp = await repos.getSignupOtp(email, { purpose: 'p2p_password_reset' });
    if (!otp || otp.code !== code || new Date(otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    const hash = repos.hashPassword(newPassword);
    await repos.updateP2PCredentialPassword(email, hash);
    await repos.deleteSignupOtp(email, { purpose: 'p2p_password_reset' });
    return res.json({ message: 'Password reset successfully. Please login.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/p2p/logout', async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[P2P_USER_COOKIE_NAME];
  const refreshToken = authMiddleware ? authMiddleware.extractRefreshTokenFromRequest(req) : String(cookies[P2P_REFRESH_COOKIE_NAME] || '').trim();
  const userFromRequest = await getP2PUserFromRequest(req).catch(() => null);

  try {
    if (token) {
      await repos.deleteP2PUserSession(token);
    }
    if (refreshToken) {
      await repos.deleteRefreshTokenByHash(tokenService.hashRefreshToken(refreshToken));
    } else {
      if (userFromRequest?.id) {
        await repos.deleteRefreshTokensByUserId(userFromRequest.id);
      }
    }

    clearCookie(res, P2P_USER_COOKIE_NAME);
    clearP2PAuthCookies(res);
    return res.json({ message: 'Logged out from P2P.' });
  } catch (error) {
    clearCookie(res, P2P_USER_COOKIE_NAME);
    clearP2PAuthCookies(res);
    return res.status(500).json({ message: 'Server error while logging out from P2P.' });
  }
});

app.get('/api/p2p/me', async (req, res) => {
  const user = await getP2PUserFromRequest(req);

  if (!user) {
    return res.json({ loggedIn: false, user: null });
  }

  const kycProfile = await getP2PKycProfileByEmail(user.email);

  return res.json({
    loggedIn: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: tokenService.normalizeRole(user.role || 'USER'),
      kyc: kycProfile
    }
  });
});

app.get('/api/p2p/kyc/status', requiresP2PUser, async (req, res) => {
  try {
    const kycProfile = await getP2PKycProfileByEmail(req.p2pUser.email);
    return res.json({
      kyc: kycProfile
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading KYC status.' });
  }
});

app.post('/api/p2p/kyc/submit', requiresP2PUser, async (req, res) => {
  const userId = String(req.p2pUser?.id || '').trim();
  const email = String(req.p2pUser?.email || '')
    .trim()
    .toLowerCase();

  if (!userId || !email) {
    return res.status(401).json({ message: 'Please login to continue.' });
  }

  if (
    !repos ||
    typeof repos.upsertP2PKycRequest !== 'function' ||
    typeof repos.updateP2PCredentialKyc !== 'function'
  ) {
    return res.status(503).json({ message: 'KYC service is unavailable right now.' });
  }

  const consentRaw = req.body?.consent;
  const consentGiven =
    consentRaw === true ||
    String(consentRaw || '')
      .trim()
      .toLowerCase() === 'true';
  if (!consentGiven) {
    return res.status(400).json({ message: 'Consent is required to continue KYC verification.' });
  }

  let aadhaarDigits = '';
  let aadhaarFrontImage = null;
  let aadhaarBackImage = null;
  let selfieWithDocumentImage = null;
  try {
    aadhaarDigits = normalizeAadhaarNumber(req.body?.aadhaarNumber);
    aadhaarFrontImage = extractKycImageData(req.body?.aadhaarFrontImage, 'Aadhaar front');
    aadhaarBackImage = req.body?.aadhaarBackImage ? extractKycImageData(req.body?.aadhaarBackImage, 'Aadhaar back') : null;
    selfieWithDocumentImage = extractKycImageData(req.body?.selfieWithDocumentImage, 'Selfie with document');
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid KYC submission payload.' });
  }

  try {
    const currentCredential = await repos.getP2PCredential(email);
    if (!currentCredential) {
      return res.status(400).json({ message: 'Please login again before submitting KYC documents.' });
    }
    const currentKyc = buildP2PKycProfileFromCredential(currentCredential || {});

    if (currentKyc.status === 'VERIFIED') {
      return res.json({
        message: 'KYC is already verified for this account.',
        kyc: currentKyc
      });
    }

    const requestId = createKycRequestId();
    const submittedAt = new Date();
    const faceMatch = await runKycFaceMatch({
      aadhaarFrontImage,
      selfieWithDocumentImage
    });

    // Auto-approve when face match is available AND passed.
    // Auto-reject when face match is available AND failed (score too low).
    // Fall back to manual PENDING_REVIEW when face match provider is unavailable.
    let nextStatus;
    let rejectionReason = '';
    if (faceMatch.available && faceMatch.passed) {
      nextStatus = 'VERIFIED';
    } else if (faceMatch.available && !faceMatch.passed) {
      nextStatus = 'REJECTED';
      rejectionReason = faceMatch.reason === 'face_very_different'
        ? 'Face in selfie does not match the Aadhaar photo. Please re-submit with a clear selfie.'
        : `Face similarity score (${faceMatch.score}/100) is below the required threshold (${KYC_FACE_MATCH_THRESHOLD}/100). Please re-submit with a clearer photo.`;
    } else {
      // Face match service unavailable — queue for manual admin review
      nextStatus = 'PENDING_REVIEW';
    }

    await repos.upsertP2PKycRequest(userId, email, {
      requestId,
      status: nextStatus,
      aadhaarMasked: maskAadhaar(aadhaarDigits),
      aadhaarHash: hashSensitive(aadhaarDigits),
      aadhaarFrontImage: encryptText(aadhaarFrontImage.dataUrl),
      aadhaarBackImage: aadhaarBackImage ? encryptText(aadhaarBackImage.dataUrl) : '',
      selfieWithDocumentImage: encryptText(selfieWithDocumentImage.dataUrl),
      rejectionReason,
      faceMatch: {
        provider: faceMatch.provider,
        available: Boolean(faceMatch.available),
        passed: Boolean(faceMatch.passed),
        score: faceMatch.score,
        reason: String(faceMatch.reason || '').trim(),
        threshold: KYC_FACE_MATCH_THRESHOLD,
        aadhaarImageHash: aadhaarFrontImage.sha256,
        selfieImageHash: selfieWithDocumentImage.sha256,
        aadhaarImageSize: aadhaarFrontImage.sizeBytes,
        selfieImageSize: selfieWithDocumentImage.sizeBytes,
        checkedAt: submittedAt.toISOString()
      },
      createdAt: submittedAt
    });

    const updatedCredential = await repos.updateP2PCredentialKyc(email, {
      status: nextStatus,
      requestId,
      kycLevel: 'FULL',
      aadhaarLast4: aadhaarDigits.slice(-4),
      faceMatchScore: faceMatch.score,
      faceMatchProvider: faceMatch.provider,
      rejectionReason
    });

    const kycProfile = buildP2PKycProfileFromCredential(updatedCredential || {});
    if (auditLogService) {
      await auditLogService.safeLog({
        userId,
        action: 'kyc_submitted',
        ipAddress: getRequestIp(req),
        metadata: {
          requestId,
          status: nextStatus,
          faceMatchScore: faceMatch.score,
          faceMatchProvider: faceMatch.provider,
          faceMatchAvailable: Boolean(faceMatch.available)
        }
      });
    }

    const statusMessageByState = {
      VERIFIED: 'KYC verified successfully! You can now trade on Bitegit.',
      REJECTED: rejectionReason || 'KYC verification failed. Please re-submit with clearer photos.',
      PENDING_REVIEW: 'KYC submitted successfully. Our team will review your documents shortly.'
    };

    return res.status(202).json({
      message: statusMessageByState[nextStatus] || 'KYC submitted successfully.',
      kyc: kycProfile,
      faceMatch: {
        available: Boolean(faceMatch.available),
        passed: Boolean(faceMatch.passed),
        score: faceMatch.score,
        threshold: KYC_FACE_MATCH_THRESHOLD,
        provider: faceMatch.provider,
        reason: String(faceMatch.reason || '').trim()
      }
    });
  } catch (error) {
    console.error('[KYC submit error]', error?.message, error?.stack);
    return res.status(500).json({ message: 'Server error while submitting KYC verification.' });
  }
});

if (ENABLE_DEV_TEST_ROUTES) {
  app.get('/api/security/protected-sample', requiresP2PUser, (req, res) => {
    return res.json({
      message: 'Protected route access granted.',
      user: {
        id: req.p2pUser.id,
        username: req.p2pUser.username,
        role: req.p2pUser.role
      }
    });
  });
}

app.get(
  '/api/security/object/:id',
  requiresP2PUser,
  validateRequest([validation.mongoObjectId('id', 'params', 'id')]),
  (req, res) => {
    return res.json({
      message: 'Valid ObjectId.',
      id: req.params.id
    });
  }
);

app.get('/api/p2p/wallet', requiresP2PUser, async (req, res) => {
  try {
    const ensured = await walletService.ensureWallet(req.p2pUser.id, {
      username: req.p2pUser.username
    });
    const depositConfig = await getUsdtDepositConfigForUser();
    const depositWallets = await getDepositWalletCatalogForUser();
    const assetBalances =
      ensured && ensured.assets && typeof ensured.assets === 'object'
        ? ensured.assets
        : {
            USDT: Number(ensured.availableBalance || ensured.balance || 0)
          };
    return res.json({
      wallet: {
        ...ensured,
        depositAddress: depositConfig.depositAddress,
        depositNetwork: depositConfig.activeNetwork?.network || depositConfig.defaultNetwork,
        depositNetworks: depositConfig.networks,
        assetBalances
      },
      depositConfig,
      depositWallets
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading wallet.' });
  }
});

app.get('/api/wallet/summary', requiresP2PUser, async (req, res) => {
  try {
    const wallet = await walletService.ensureWallet(req.p2pUser.id, {
      username: req.p2pUser.username
    });
    const depositConfig = await getUsdtDepositConfigForUser();
    const depositWallets = await getDepositWalletCatalogForUser();
    const assetBalances =
      wallet && wallet.assets && typeof wallet.assets === 'object'
        ? wallet.assets
        : {
            USDT: Number(wallet.availableBalance || wallet.balance || 0)
          };

    return res.json({
      summary: {
        total_balance: Number(wallet.totalBalance || 0),
        available_balance: Number(wallet.availableBalance || wallet.balance || 0),
        locked_balance: Number(wallet.lockedBalance || wallet.p2pLocked || 0),
        spot_balance: Number(wallet.availableBalance || wallet.balance || 0),
        funding_balance: Number(wallet.availableBalance || wallet.balance || 0),
        asset_balances: assetBalances,
        deposit_address: depositConfig.depositAddress,
        deposit_network: depositConfig.activeNetwork?.network || depositConfig.defaultNetwork,
        deposit_networks: depositConfig.networks
      },
      wallet: {
        ...wallet,
        depositAddress: depositConfig.depositAddress,
        depositNetwork: depositConfig.activeNetwork?.network || depositConfig.defaultNetwork,
        depositNetworks: depositConfig.networks,
        assetBalances
      },
      depositConfig,
      depositWallets
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading wallet summary.' });
  }
});

app.get('/api/deposits/active', requiresP2PUser, async (req, res) => {
  if (!adminStore || typeof adminStore.getPendingDepositByUser !== 'function') {
    return res.status(503).json({ message: 'Deposit service is not available right now.' });
  }

  try {
    const pending = await adminStore.getPendingDepositByUser(req.p2pUser.id);
    return res.json({
      hasActiveDeposit: Boolean(pending),
      deposit: pending || null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading active deposit session.' });
  }
});

app.get('/api/deposits/wallets', requiresP2PUser, async (req, res) => {
  try {
    const coins = await getDepositWalletCatalogForUser();
    return res.json({
      total: coins.length,
      coins
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading deposit wallets.' });
  }
});

app.get('/api/deposits', requiresP2PUser, async (req, res) => {
  if (!adminStore || typeof adminStore.listUserDeposits !== 'function') {
    return res.status(503).json({ message: 'Deposit service is not available right now.' });
  }

  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || 20), 10) || 20));
  try {
    const deposits = await adminStore.listUserDeposits(req.p2pUser.id, { limit });
    return res.json({
      total: deposits.length,
      deposits
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching deposits.' });
  }
});

app.post(
  '/api/deposits',
  requiresP2PUser,
  validateRequest([
    validation.required('coin'),
    validation.required('network'),
    validation.required('address'),
    validation.required('amount'),
    validation.amount('amount')
  ]),
  async (req, res) => {
    if (!adminStore || typeof adminStore.createDepositRequest !== 'function') {
      return res.status(503).json({ message: 'Deposit service is not available right now.' });
    }

    const coin = String(req.body.coin || '').trim().toUpperCase();
    const network = String(req.body.network || req.body.chain || '').trim().toUpperCase();
    const amount = Number(req.body.amount);
    const address = String(req.body.address || '').trim();
    const txHash = String(req.body.txHash || req.body.txid || '').trim();
    const proofUrl = String(
      req.body.proofUrl || req.body.depositProof || req.body.proofFileUrl || req.body.screenshotUrl || ''
    ).trim();
    const requestIp = getRequestIp(req);

    if (coin === 'USDT') {
      const normalizedNetwork = normalizeUsdtNetwork(network);
      if (!isValidAddressForNetwork(address, normalizedNetwork)) {
        return res.status(400).json({
          message: `Invalid ${normalizedNetwork} deposit address format.`
        });
      }
    }

    try {
      const deposit = await adminStore.createDepositRequest({
        userId: req.p2pUser.id,
        email: req.p2pUser.email,
        username: req.p2pUser.username,
        coin,
        network,
        address,
        amount,
        txHash,
        proofUrl,
        metadata: {
          source: 'api.deposits',
          ipAddress: requestIp,
          userAgent: String(req.headers['user-agent'] || '').trim()
        }
      });

      if (auditLogService) {
        await auditLogService.safeLog({
          userId: req.p2pUser.id,
          action: 'deposit_request_created',
          ipAddress: requestIp,
          metadata: {
            depositId: deposit.id,
            coin: deposit.coin,
            network: deposit.network,
            amount: deposit.amount
          }
        });
      }

      return res.status(201).json({
        message: 'Deposit request created. Awaiting admin confirmation.',
        deposit
      });
    } catch (error) {
      if (auditLogService) {
        await auditLogService.safeLog({
          userId: req.p2pUser.id,
          action: 'deposit_request_failed',
          ipAddress: requestIp,
          metadata: {
            coin,
            network,
            amount,
            address,
            errorCode: String(error.code || 'DEPOSIT_REQUEST_ERROR'),
            errorMessage: String(error.message || 'Deposit request failed')
          }
        });
      }

      const message = String(error?.message || 'Server error while creating deposit request.');
      if (message.toLowerCase().includes('active deposit request')) {
        return res.status(409).json({ message });
      }
      if (message.toLowerCase().includes('unsupported')) {
        return res.status(400).json({ message });
      }
      return res.status(500).json({ message });
    }
  }
);

app.post(
  '/api/withdrawals',
  requiresP2PUser,
  validateRequest([
    validation.required('amount'),
    validation.amount('amount'),
    validation.required('currency'),
    validation.required('address')
  ]),
  async (req, res) => {
    const amount = Number(req.body.amount);
    const currency = String(req.body.currency || 'USDT')
      .trim()
      .toUpperCase();
    const address = String(req.body.address || '').trim();
    const requestedNetwork = String(req.body.network || req.body.chain || req.body.blockchain || '').trim();
    const network = normalizeUsdtNetwork(requestedNetwork || 'TRC20');
    const requestIp = getRequestIp(req);

    if (currency === 'USDT' && !isValidAddressForNetwork(address, network)) {
      return res.status(400).json({
        message: `Invalid ${network} withdrawal address format.`
      });
    }

    try {
      const withdrawal = await walletService.createWithdrawalRequest(req.p2pUser.id, {
        username: req.p2pUser.username,
        amount,
        currency,
        address,
        metadata: {
          source: 'api_withdrawals',
          network,
          ipAddress: requestIp,
          userAgent: String(req.headers['user-agent'] || '').trim()
        }
      });

      if (auditLogService) {
        await auditLogService.safeLog({
          userId: req.p2pUser.id,
          action: 'withdrawal_request_created',
          ipAddress: requestIp,
          metadata: {
            requestId: withdrawal.requestId,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            network
          }
        });
      }

      return res.status(201).json({
        message: 'Withdrawal request created.',
        withdrawal
      });
    } catch (error) {
      if (auditLogService) {
        await auditLogService.safeLog({
          userId: req.p2pUser.id,
          action: 'withdrawal_request_failed',
          ipAddress: requestIp,
          metadata: {
            amount,
            currency,
            network,
            address,
            errorCode: String(error.code || 'WITHDRAWAL_ERROR'),
            errorMessage: String(error.message || 'Withdrawal request failed')
          }
        });
      }
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error while creating withdrawal request.' });
    }
  }
);

app.get('/api/withdrawals', requiresP2PUser, async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 25;
  try {
    const withdrawals = await walletService.listWithdrawalRequests(req.p2pUser.id, { limit });
    return res.json({
      total: withdrawals.length,
      withdrawals
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching withdrawals.' });
  }
});

app.post('/api/withdrawals/:requestId/cancel', requiresP2PUser, async (req, res) => {
  const requestId = String(req.params.requestId || '').trim();
  if (!requestId) {
    return res.status(400).json({ message: 'Withdrawal request id is required.' });
  }

  const requestIp = getRequestIp(req);
  try {
    const withdrawal = await walletService.processWithdrawalRequest(requestId, 'rejected', {
      userId: req.p2pUser.id,
      username: req.p2pUser.username,
      reason: 'User cancelled withdrawal request',
      isAdmin: false
    });

    if (auditLogService) {
      await auditLogService.safeLog({
        userId: req.p2pUser.id,
        action: 'withdrawal_request_cancelled',
        ipAddress: requestIp,
        metadata: {
          requestId,
          status: withdrawal.status
        }
      });
    }

    return res.json({
      message: 'Withdrawal request cancelled.',
      withdrawal
    });
  } catch (error) {
    if (auditLogService) {
      await auditLogService.safeLog({
        userId: req.p2pUser.id,
        action: 'withdrawal_request_cancel_failed',
        ipAddress: requestIp,
        metadata: {
          requestId,
          errorCode: String(error.code || 'WITHDRAWAL_CANCEL_ERROR'),
          errorMessage: String(error.message || 'Withdrawal cancellation failed')
        }
      });
    }
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error while cancelling withdrawal request.' });
  }
});

app.get('/api/p2p/exchange-ticker', async (req, res) => {
  const requestedSymbols = String(req.query.symbols || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^[A-Z0-9]{5,12}$/.test(item))
    .slice(0, 10);
  const symbols = requestedSymbols.length > 0 ? requestedSymbols : DEFAULT_TICKER_SYMBOLS;
  const encodedSymbols = encodeURIComponent(JSON.stringify(symbols));

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodedSymbols}`
    );
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      throw new Error('Exchange API unavailable');
    }

    const ticker = data.map((item) => ({
      symbol: item.symbol,
      lastPrice: Number(item.lastPrice),
      change24h: Number(item.priceChangePercent)
    }));

    return res.json({
      source: 'binance',
      updatedAt: new Date().toISOString(),
      ticker
    });
  } catch (error) {
    return res.json({
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      ticker: createFallbackTickerSnapshot(symbols)
    });
  }
});

app.get('/api/p2p/market-depth', async (req, res) => {
  const symbol = normalizeMarketSymbol(req.query.symbol);

  try {
    const [tickerRes, depthRes, tradesRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`),
      fetch(`https://api.binance.com/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=12`),
      fetch(`https://api.binance.com/api/v3/trades?symbol=${encodeURIComponent(symbol)}&limit=18`)
    ]);

    const [tickerRaw, depthRaw, tradesRaw] = await Promise.all([tickerRes.json(), depthRes.json(), tradesRes.json()]);

    if (!tickerRes.ok || !depthRes.ok || !tradesRes.ok || !Array.isArray(depthRaw.bids) || !Array.isArray(depthRaw.asks)) {
      throw new Error('Binance market depth unavailable');
    }

    const bids = depthRaw.bids.slice(0, 10).map(([price, quantity]) => {
      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);
      return {
        price: numericPrice,
        quantity: numericQuantity,
        total: Number((numericPrice * numericQuantity).toFixed(2))
      };
    });

    const asks = depthRaw.asks.slice(0, 10).map(([price, quantity]) => {
      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);
      return {
        price: numericPrice,
        quantity: numericQuantity,
        total: Number((numericPrice * numericQuantity).toFixed(2))
      };
    });

    const trades = Array.isArray(tradesRaw)
      ? tradesRaw.slice(0, 18).map((trade) => ({
          id: trade.id,
          price: Number(trade.price),
          quantity: Number(trade.qty),
          side: trade.isBuyerMaker ? 'sell' : 'buy',
          time: Number(trade.time)
        }))
      : [];

    return res.json({
      source: 'binance',
      symbol,
      updatedAt: new Date().toISOString(),
      ticker: {
        lastPrice: Number(tickerRaw.lastPrice || 0),
        change24h: Number(tickerRaw.priceChangePercent || 0),
        high24h: Number(tickerRaw.highPrice || 0),
        low24h: Number(tickerRaw.lowPrice || 0),
        volume24h: Number(tickerRaw.volume || 0)
      },
      orderBook: { bids, asks },
      trades
    });
  } catch (error) {
    return res.json(createFallbackOrderBook(symbol));
  }
});

app.get('/api/p2p/klines', async (req, res) => {
  const symbol = normalizeMarketSymbol(req.query.symbol);
  const interval = normalizeKlineInterval(req.query.interval);
  const limit = normalizeKlineLimit(req.query.limit);

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
    );
    const raw = await response.json();
    if (!response.ok || !Array.isArray(raw)) {
      throw new Error('Binance kline API unavailable');
    }

    const klines = raw
      .map((entry) => ({
        openTime: Number(entry[0]),
        closeTime: Number(entry[6]),
        open: Number(entry[1]),
        high: Number(entry[2]),
        low: Number(entry[3]),
        close: Number(entry[4]),
        volume: Number(entry[5])
      }))
      .filter(
        (item) =>
          Number.isFinite(item.openTime) &&
          Number.isFinite(item.closeTime) &&
          Number.isFinite(item.open) &&
          Number.isFinite(item.high) &&
          Number.isFinite(item.low) &&
          Number.isFinite(item.close) &&
          Number.isFinite(item.volume)
      );

    if (!klines.length) {
      throw new Error('No klines returned');
    }

    return res.json({
      source: 'binance',
      symbol,
      interval,
      klines
    });
  } catch (error) {
    return res.json(createFallbackKlines(symbol, interval, limit));
  }
});

app.post('/api/trade/orders', async (req, res) => {
  const symbol = normalizeMarketSymbol(req.body.symbol);
  const market = String(req.body.market || 'spot')
    .trim()
    .toLowerCase();
  const side = normalizeTradeSide(req.body.side);
  const amountUsdt = normalizeTradeAmount(req.body.amountUsdt);

  if (!['spot', 'perp'].includes(market)) {
    return res.status(400).json({ message: 'Market must be spot or perp.' });
  }

  if (!Number.isFinite(amountUsdt) || amountUsdt < 10 || amountUsdt > 1000000) {
    return res.status(400).json({ message: 'Amount must be between 10 and 1,000,000 USDT.' });
  }

  let referencePrice = 0;
  let priceSource = 'fallback';

  try {
    const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
    const tickerRaw = await tickerRes.json();

    if (tickerRes.ok && tickerRaw && Number(tickerRaw.lastPrice) > 0) {
      referencePrice = Number(tickerRaw.lastPrice);
      priceSource = 'binance';
    }
  } catch (error) {
    // Fall through to generated snapshot price.
  }

  if (!referencePrice || !Number.isFinite(referencePrice)) {
    const fallbackTicker = createFallbackTickerSnapshot([symbol])[0];
    referencePrice = Number(fallbackTicker.lastPrice || 0);
  }

  if (!referencePrice || !Number.isFinite(referencePrice)) {
    return res.status(503).json({ message: 'Unable to get market price right now.' });
  }

  const estimatedQty = Number((amountUsdt / referencePrice).toFixed(8));
  const now = Date.now();
  const order = {
    id: `trd_${now}_${Math.floor(Math.random() * 10000)}`,
    symbol,
    market,
    side,
    amountUsdt,
    referencePrice: Number(referencePrice.toFixed(6)),
    estimatedQty,
    status: 'FILLED',
    source: priceSource,
    createdAt: now
  };

  try {
    const savedOrder = await repos.createTradeOrder(order);
    return res.status(201).json({
      message: `${side.toUpperCase()} order executed successfully.`,
      order: savedOrder
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving trade order.' });
  }
});

app.get('/api/trade/orders', async (req, res) => {
  try {
    const [orders, total] = await Promise.all([repos.listTradeOrders(30), repos.countTradeOrders()]);
    return res.json({
      total,
      orders
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching trade orders.' });
  }
});

app.post('/api/leads', async (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and contact are required.' });
  }

  const cleanedName = String(name).trim();
  const rawContact = String(mobile).trim();
  const cleanedMobile = rawContact.replace(/\D/g, '');
  const isPhone = /^\d{10}$/.test(cleanedMobile);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact);

  if (cleanedName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  if (!isPhone && !isEmail) {
    return res.status(400).json({ message: 'Enter a valid 10-digit mobile number or email.' });
  }

  try {
    await saveLeadRecord(cleanedName, isPhone ? cleanedMobile : rawContact.toLowerCase(), {
      verified: false,
      source: 'direct_form'
    });
    return res.status(201).json({ message: 'Lead saved successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving lead.' });
  }
});

app.get('/api/leads', requiresAdminSession, async (req, res) => {
  try {
    const leads = await readLeads();
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching leads.' });
  }
});

app.get('/api/p2p/offers', async (req, res) => {
  const side = String(req.query.side || 'buy').toLowerCase();
  const asset = String(req.query.asset || 'USDT').toUpperCase();
  const payment = String(req.query.payment || '').trim().toLowerCase();
  const advertiser = String(req.query.advertiser || '').trim().toLowerCase();
  const amount = Number(req.query.amount || 0);
  const pageSize = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const pageOffset = Math.max(Number(req.query.offset || 0), 0);

  const normalizedSide = side === 'sell' ? 'sell' : 'buy';

  try {
    // Step-1 secure listing: only production escrow-backed active ads.
    const allOffers = await repos.listOffers({
      side: normalizedSide,
      asset,
      activeOnly: true,
      merchantDepositLocked: true,
      availableOnly: true,
      excludeDemo: true,
      escrowBackedOnly: true,
      merchantOwnedOnly: true
    });
    const filtered = allOffers
      .filter((offer) => {
        if (!payment) {
          return true;
        }
        return offer.payments.some((method) => method.toLowerCase().includes(payment));
      })
      .filter((offer) => {
        if (!advertiser) {
          return true;
        }
        return offer.advertiser.toLowerCase().includes(advertiser);
      })
      .filter((offer) => {
        if (!amount || Number.isNaN(amount)) {
          return true;
        }
        return amount >= offer.minLimit && amount <= offer.maxLimit;
      })
      .sort((a, b) => {
        if (normalizedSide === 'buy') {
          return a.price - b.price;
        }
        return b.price - a.price;
      });

    const totalCount = filtered.length;
    const paginated = filtered.slice(pageOffset, pageOffset + pageSize);

    // Enrich each offer with advertiser reputation
    const enriched = await Promise.all(paginated.map(async (offer) => {
      try {
        const userId = offer.createdByUserId;
        if (!userId) return offer;
        const rep = await repos.getUserReputation(userId);
        if (!rep) return offer;
        return { ...offer, reputation: rep };
      } catch (_) { return offer; }
    }));

    return res.json({
      side: normalizedSide,
      asset,
      total: totalCount,
      offset: pageOffset,
      limit: pageSize,
      hasMore: pageOffset + pageSize < totalCount,
      updatedAt: new Date().toISOString(),
      offers: enriched
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching offers.' });
  }
});

// ===== PAYMENT METHODS =====
app.get('/api/p2p/payment-methods', requiresP2PUser, async (req, res) => {
  try {
    const methods = await repos.listPaymentMethods(req.p2pUser.userId);
    return res.json({ methods });
  } catch (e) { return res.status(500).json({ message: 'Server error.' }); }
});

app.post('/api/p2p/payment-methods', requiresP2PUser, async (req, res) => {
  try {
    const { type, nickname, upiId, bankName, accountNumber, ifsc, accountHolder, details } = req.body;
    if (!type) return res.status(400).json({ message: 'type is required.' });
    const existing = await repos.listPaymentMethods(req.p2pUser.userId);
    if (existing.length >= 20) return res.status(400).json({ message: 'Max 20 payment methods allowed.' });
    const method = await repos.addPaymentMethod(req.p2pUser.userId, { type, nickname, upiId, bankName, accountNumber, ifsc, accountHolder, details });
    return res.json({ method });
  } catch (e) { return res.status(500).json({ message: 'Server error.' }); }
});

app.patch('/api/p2p/payment-methods/:pmId', requiresP2PUser, async (req, res) => {
  try {
    const updated = await repos.updatePaymentMethod(req.params.pmId, req.p2pUser.userId, req.body);
    if (!updated) return res.status(404).json({ message: 'Payment method not found.' });
    return res.json({ method: updated });
  } catch (e) { return res.status(500).json({ message: 'Server error.' }); }
});

app.delete('/api/p2p/payment-methods/:pmId', requiresP2PUser, async (req, res) => {
  try {
    const deleted = await repos.deletePaymentMethod(req.params.pmId, req.p2pUser.userId);
    if (!deleted) return res.status(404).json({ message: 'Payment method not found.' });
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ message: 'Server error.' }); }
});
// ===== END PAYMENT METHODS =====

// GET /api/p2p/users/:userId/reputation
app.get('/api/p2p/users/:userId/reputation', async (req, res) => {
  try {
    const rep = await repos.getUserReputation(req.params.userId);
    if (!rep) return res.status(404).json({ message: 'User not found.' });
    return res.json(rep);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/p2p/ads', async (req, res) => {
  const side = String(req.query.side || '').trim().toLowerCase();
  const asset = String(req.query.asset || 'USDT').trim().toUpperCase();
  const normalizedSide = side === 'sell' ? 'sell' : side === 'buy' ? 'buy' : '';

  try {
    const offers = await repos.listOffers({
      side: normalizedSide || undefined,
      asset,
      activeOnly: true,
      merchantDepositLocked: true,
      availableOnly: true,
      excludeDemo: true,
      escrowBackedOnly: true,
      merchantOwnedOnly: true
    });

    return res.json({
      success: true,
      total: offers.length,
      ads: offers
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching ads.' });
  }
});

// Get single ad by ID
app.get('/api/p2p/ads/:adId', async (req, res) => {
  try {
    const offer = await repos.getOfferById(req.params.adId);
    if (!offer) return res.status(404).json({ message: 'Ad not found.' });
    return res.json({ success: true, ad: offer });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Convenience: mark order paid
app.post('/api/p2p/orders/:orderId/mark-paid', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const updatedOrder = await walletService.markOrderPaid(req.params.orderId, req.p2pUser);
    const normalizedOrder = normalizeOrderState(updatedOrder);
    broadcastOrderEvent(updatedOrder.id, 'order_update', { order: normalizedOrder });
    return res.json({ success: true, order: normalizedOrder });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error.' });
  }
});

// Convenience: cancel order
app.post('/api/p2p/orders/:orderId/cancel', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const updatedOrder = await walletService.cancelOrder(req.params.orderId, req.p2pUser, 'CANCELLED');
    const normalizedOrder = normalizeOrderState(updatedOrder);
    broadcastOrderEvent(updatedOrder.id, 'order_update', { order: normalizedOrder });
    return res.json({ success: true, order: normalizedOrder });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error.' });
  }
});

async function createP2PAdController(req, res) {
  try {
    const savedOffer = await walletService.createEscrowAd({
      actor: req.p2pUser,
      offerId: await createOfferId(),
      payload: req.body || {}
    });

    return res.status(201).json({
      message: 'Ad created successfully.',
      offer: savedOffer
    });
  } catch (error) {
    const knownStatus = Number(error?.status || 0);
    const knownCode = String(error?.code || '').trim().toUpperCase();
    const knownMessage = String(error?.message || '');
    if (
      knownCode.includes('INSUFFICIENT') ||
      knownMessage.toLowerCase().includes('insufficient')
    ) {
      return res.status(400).json({
        message: 'Insufficient USDT balance',
        code: 'INSUFFICIENT_USDT_BALANCE'
      });
    }
    if (knownStatus >= 400 && knownStatus < 500) {
      return res.status(knownStatus).json({
        message: knownMessage || 'Request validation failed.',
        code: knownCode || 'P2P_AD_CREATE_FAILED'
      });
    }

    const validationLikeMessage = knownMessage.toLowerCase();
    if (
      validationLikeMessage.includes('must') ||
      validationLikeMessage.includes('invalid') ||
      validationLikeMessage.includes('add at least one payment method')
    ) {
      return res.status(400).json({
        message: String(error.message || 'Invalid ad payload.')
      });
    }

    return res.status(500).json({ message: 'Server error while creating ad.' });
  }
}

// Backward compatible + new secure endpoint.
app.post('/api/p2p/offers', requiresP2PUser, createP2PAdController);
app.post('/api/p2p/ads', requiresP2PUser, createP2PAdController);

// GET my ads
app.get('/api/p2p/my-ads', requiresP2PUser, async (req, res) => {
  try {
    const userId = req.p2pUser.userId;
    const allOffers = await repos.listOffers({ excludeDemo: true });
    const mine = allOffers.filter(o => o.createdByUserId === userId);
    return res.json({ offers: mine });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/p2p/offers/:offerId — edit price/limits/payments/status(pause/resume)
app.patch('/api/p2p/offers/:offerId', requiresP2PUser, async (req, res) => {
  try {
    const userId = req.p2pUser.userId;
    const { offerId } = req.params;
    const offer = await repos.getOfferById(offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found.' });
    if (offer.createdByUserId !== userId) return res.status(403).json({ message: 'Not your ad.' });

    const { price, minLimit, maxLimit, payments, status, remark } = req.body;
    // Validate status transitions
    if (status && !['ACTIVE', 'PAUSED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be ACTIVE or PAUSED.' });
    }
    const updated = await repos.updateOffer(offerId, userId, { price, minLimit, maxLimit, payments, status, remark });
    if (!updated) return res.status(404).json({ message: 'Update failed.' });
    return res.json({ offer: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/p2p/offers/:offerId
app.delete('/api/p2p/offers/:offerId', requiresP2PUser, async (req, res) => {
  try {
    const userId = req.p2pUser.userId;
    const { offerId } = req.params;
    const offer = await repos.getOfferById(offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found.' });
    if (offer.createdByUserId !== userId) return res.status(403).json({ message: 'Not your ad.' });
    // Check no active orders on this offer
    const activeOrders = await repos.listP2PLiveOrders({ asset: offer.asset, side: offer.side });
    const hasActive = activeOrders.some(o => (o.adId === offerId || o.offerId === offerId) && ['CREATED','PAYMENT_SENT','DISPUTED'].includes(o.status));
    if (hasActive) return res.status(409).json({ message: 'Cannot delete ad with active orders.' });
    const deleted = await repos.deleteOffer(offerId, userId);
    if (!deleted) return res.status(404).json({ message: 'Delete failed.' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/merchant/activate', requiresP2PUser, async (req, res) => {
  try {
    const activation = await walletService.activateMerchant({
      actor: req.p2pUser,
      depositAmount: MERCHANT_ACTIVATION_DEPOSIT
    });

    return res.json({
      success: true,
      message: 'Merchant activated successfully.',
      merchant: activation.merchant,
      wallet: activation.wallet
    });
  } catch (error) {
    const knownStatus = Number(error?.status || 0);
    if (knownStatus >= 400 && knownStatus < 500) {
      return res.status(knownStatus).json({
        success: false,
        message: String(error.message || 'Merchant activation failed.'),
        code: String(error.code || 'MERCHANT_ACTIVATION_FAILED')
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error while activating merchant.'
    });
  }
});

// Returns only the current user's own active orders (for mobile Active tab)
app.get('/api/p2p/orders/my-active', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const userId = req.p2pUser.id;
    const username = req.p2pUser.username;
    const result = await repos.listP2POrderHistory(userId, { limit: 50, offset: 0 });
    console.log(`[my-active] user=${username} id=${userId} total_orders=${result.total}`);
    const activeStatuses = ['CREATED', 'PENDING', 'PAID', 'PAYMENT_SENT', 'DISPUTED'];
    const activeOrders = result.orders
      .filter((o) => activeStatuses.includes(o.status))
      .map((order) => {
        const normalized = normalizeOrderState(order);
        return { ...normalized, isParticipant: true, paymentMethod: order.paymentMethod };
      });
    console.log(`[my-active] active_orders=${activeOrders.length}`);
    return res.json({ orders: activeOrders });
  } catch (error) {
    console.error('[my-active] error:', error);
    return res.status(500).json({ message: 'Server error fetching active orders.' });
  }
});

app.get('/api/p2p/orders/live', requiresP2PUser, async (req, res) => {
  const side = String(req.query.side || '').trim().toLowerCase();
  const asset = String(req.query.asset || '').trim().toUpperCase();

  try {
    await walletService.expireOrders();
    const liveOrders = (await repos.listP2PLiveOrders({ side: side || undefined, asset: asset || undefined, limit: 20 }))
      .map((order) => normalizeOrderState(order))
      .map((order) => ({
        id: order.id,
        reference: order.reference,
        side: order.side,
        asset: order.asset,
        status: order.status,
        advertiser: order.advertiser,
        amountInr: order.amountInr,
        price: order.price,
        participantsLabel: order.participantsLabel,
        isParticipant: order.participants.some((participant) => participant.id === req.p2pUser.id),
        updatedAt: order.updatedAt,
        remainingSeconds: order.remainingSeconds
      }));

    return res.json({
      total: liveOrders.length,
      orders: liveOrders
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching live orders.' });
  }
});

app.get('/api/p2p/orders/history', requiresP2PUser, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  try {
    const result = await repos.listP2POrderHistory(req.p2pUser.id, { limit, offset });
    const orders = result.orders.map((o) => normalizeOrderState(o));
    return res.json({ total: result.total, hasMore: result.hasMore, offset, limit, orders });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/p2p/orders/by-reference/:reference', requiresP2PUser, async (req, res) => {
  const reference = String(req.params.reference || '').trim();

  try {
    await walletService.expireOrders();
    const orderByReference = await findOrderByReference(reference);

    if (!orderByReference) {
      return res.status(404).json({ message: 'Order not found for this reference.' });
    }

    if (!isParticipant(orderByReference, req.p2pUser.id)) {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }

    return res.json({
      order: normalizeOrderState(orderByReference)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching order by reference.' });
  }
});

app.post('/api/p2p/orders/:orderId/join', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const order = await repos.getP2POrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (!isParticipant(order, req.p2pUser.id)) {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }

    return res.json({
      message: 'Order opened.',
      order: normalizeOrderState(order)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while opening order.' });
  }
});

app.get('/api/p2p/orders/:orderId', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const order = await repos.getP2POrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isParticipant(order, req.p2pUser.id)) {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }

    return res.json({
      order: normalizeOrderState(order)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching order.' });
  }
});

app.post('/api/p2p/orders/:orderId/status', requiresP2PUser, async (req, res) => {
  const action = String(req.body.action || '').trim().toLowerCase();

  try {
    await walletService.expireOrders();

    let updatedOrder = null;
    if (action === 'cancel') {
      updatedOrder = await walletService.cancelOrder(req.params.orderId, req.p2pUser, 'CANCELLED');
    } else if (action === 'mark_paid') {
      updatedOrder = await walletService.markOrderPaid(req.params.orderId, req.p2pUser);
    } else if (action === 'release') {
      updatedOrder = await walletService.releaseOrder(req.params.orderId, req.p2pUser);
    } else if (action === 'dispute') {
      updatedOrder = await walletService.setOrderDisputed(req.params.orderId, req.p2pUser);
    } else {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    const normalizedOrder = normalizeOrderState(updatedOrder);
    const normalizedMessages = toClientMessages(updatedOrder.messages || []);

    broadcastOrderEvent(updatedOrder.id, 'order_update', { order: normalizedOrder });
    broadcastOrderEvent(updatedOrder.id, 'message_update', { messages: normalizedMessages });

    // Send email notifications (non-blocking)
    if (p2pEmailService) {
      setImmediate(async () => {
        try {
          const [sellerCred, buyerCred] = await Promise.all([
            repos.getP2PCredentialByUserId(updatedOrder.sellerUserId),
            repos.getP2PCredentialByUserId(updatedOrder.buyerUserId)
          ]);
          const sellerEmail = sellerCred?.email;
          const buyerEmail = buyerCred?.email;
          if (action === 'mark_paid') {
            // Buyer paid — notify seller to release
            if (sellerEmail) await p2pEmailService.sendOrderPaid(sellerEmail, updatedOrder);
          } else if (action === 'release') {
            // Seller released — notify buyer (USDT received) and seller (confirmation)
            if (buyerEmail) await p2pEmailService.sendOrderReleased(buyerEmail, updatedOrder);
            if (sellerEmail && sellerEmail !== buyerEmail) await p2pEmailService.sendOrderReleased(sellerEmail, updatedOrder);
          } else if (action === 'cancel') {
            if (sellerEmail) await p2pEmailService.sendOrderCancelled(sellerEmail, updatedOrder);
            if (buyerEmail && buyerEmail !== sellerEmail) await p2pEmailService.sendOrderCancelled(buyerEmail, updatedOrder);
          } else if (action === 'dispute') {
            // Notify admin + both parties
            const adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
            if (adminEmail) await p2pEmailService.sendDisputeRaised(adminEmail, updatedOrder, req.p2pUser.username || req.p2pUser.email);
            if (sellerEmail) await p2pEmailService.sendDisputeRaised(sellerEmail, updatedOrder, req.p2pUser.username || req.p2pUser.email);
            if (buyerEmail && buyerEmail !== sellerEmail) await p2pEmailService.sendDisputeRaised(buyerEmail, updatedOrder, req.p2pUser.username || req.p2pUser.email);
          }
        } catch (emailErr) {
          console.warn('[p2p-email] notification failed:', emailErr.message);
        }
      });
    }

    return res.json({
      message: 'Order updated.',
      order: normalizedOrder
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error while updating order status.' });
  }
});

app.get('/api/p2p/orders/:orderId/messages', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const order = await repos.getP2POrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isParticipant(order, req.p2pUser.id)) {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }

    return res.json({
      messages: toClientMessages(order.messages)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching messages.' });
  }
});

app.post('/api/p2p/orders/:orderId/messages', requiresP2PUser, async (req, res) => {
  const text = String(req.body.text || '').trim();
  const imageBase64 = req.body.imageBase64 || null;

  if (!text && !imageBase64) {
    return res.status(400).json({ message: 'Message text or image is required.' });
  }

  try {
    await walletService.expireOrders();
    const mutation = await withOrderMutation(req.params.orderId, (next) => {
      if (!isParticipant(next, req.p2pUser.id)) {
        return { error: 'not_participant' };
      }

      if (['RELEASED', 'CANCELLED', 'EXPIRED'].includes(next.status)) {
        return { error: 'chat_closed' };
      }

      const now = Date.now();
      const msgObj = {
        id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
        sender: req.p2pUser.username,
        text: text || '',
        createdAt: now
      };
      if (imageBase64) msgObj.imageBase64 = imageBase64;
      next.messages.push(msgObj);
      next.updatedAt = now;
      return {};
    });

    if (mutation.error === 'not_found') {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (mutation.error === 'not_participant') {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }
    if (mutation.error === 'chat_closed') {
      return res.status(400).json({ message: 'Order chat is closed for this status.' });
    }
    if (mutation.error === 'conflict') {
      return res.status(409).json({ message: 'Order was updated by another user. Try again.' });
    }

    const normalizedMessages = toClientMessages(mutation.order.messages);
    broadcastOrderEvent(mutation.order.id, 'message_update', { messages: normalizedMessages });

    return res.status(201).json({
      message: 'Message sent.',
      messages: normalizedMessages
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while sending message.' });
  }
});

app.get('/api/p2p/orders/:orderId/stream', requiresP2PUser, async (req, res) => {
  try {
    await walletService.expireOrders();
    const order = await repos.getP2POrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isParticipant(order, req.p2pUser.id)) {
      return res.status(403).json({ message: 'Only buyer and seller can access this order.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const streams = getOrderStreams(order.id);
    streams.add(res);

    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'stream-connected' })}\n\n`);

    req.on('close', () => {
      streams.delete(res);
      if (streams.size === 0) {
        p2pOrderStreams.delete(order.id);
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while opening stream.' });
  }
});

// Per-user SSE: notifies seller when a new order arrives for their ad
app.get('/api/p2p/me/stream', requiresP2PUser, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const userId = req.p2pUser.id;
  const streams = getUserStreams(userId);
  streams.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'user-stream-connected' })}\n\n`);
  // Keepalive ping every 20s
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch(e) {} }, 20000);
  req.on('close', () => {
    clearInterval(ping);
    streams.delete(res);
    if (streams.size === 0) p2pUserStreams.delete(userId);
  });
});

app.get('/admin-login', (req, res) => {
  return res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bitegit-admin-login.html'));
});

app.get('/bitegit-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bitegit-admin-login.html'));
});

app.get('/admin', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const legacySessionToken = String(cookies[SESSION_COOKIE_NAME] || '').trim();
    const hasLegacySession = legacySessionToken ? await isSessionValid(legacySessionToken) : false;

    if (!hasLegacySession && adminAuthMiddleware) {
      const accessToken = String(cookies[ADMIN_ACCESS_COOKIE_NAME] || '').trim();
      if (!accessToken) {
        return res.redirect('/admin/login');
      }

      try {
        await adminStore.verifyAdminAccessToken(accessToken);
      } catch (error) {
        return res.redirect('/admin/login');
      }
    } else if (!hasLegacySession && !adminAuthMiddleware) {
      return res.redirect('/admin/login');
    }

    return res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
  } catch (error) {
    return res.redirect('/admin/login');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/markets', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'markets.html'));
});
app.get('/assets', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assets.html'));
});
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});
app.get('/p2p', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'p2p.html'));
});

app.get('/p2p-buy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'p2p-buy.html'));
});

app.get('/kyc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kyc.html'));
});

app.get('/trade', (req, res) => {
  return res.redirect('/trade/spot/BTCUSDT');
});

app.get('/trade/:market/:symbol', (req, res) => {
  const market = String(req.params.market || '')
    .trim()
    .toLowerCase();
  if (!['spot', 'perp'].includes(market)) {
    return res.redirect('/trade/spot/BTCUSDT');
  }
  return res.sendFile(path.join(__dirname, 'public', 'trade.html'));
});

app.get('/healthz', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    ready: persistenceReady,
    db: isDbConnected() ? 'connected' : 'disconnected'
  });
});

app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'OK', service: 'bitegit-backend' });
});

// Keep social feed live even before full boot/module registration completes.
app.get('/api/social/feed', async (req, res, next) => {
  if (socialFeedService) {
    return next();
  }
  try {
    await socialFeedBootstrapInitPromise;
    const authUser = await getP2PUserFromRequest(req).catch(() => null);
    const feed = await socialFeedBootstrapService.getFeed({
      tab: req.query?.tab,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
      authUser
    });
    return res.json({
      success: true,
      source: 'bootstrap-fallback',
      ...feed
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: String(error?.message || 'Social feed temporarily unavailable.'),
      code: 'SOCIAL_FEED_BOOTSTRAP_ERROR'
    });
  }
});

app.get('/api/social/suggested-creators', async (req, res, next) => {
  if (socialFeedService) {
    return next();
  }
  try {
    await socialFeedBootstrapInitPromise;
    const authUser = await getP2PUserFromRequest(req).catch(() => null);
    const items = await socialFeedBootstrapService.getSuggestedCreators({
      limit: req.query?.limit,
      authUser
    });
    return res.json({
      success: true,
      source: 'bootstrap-fallback',
      items
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: String(error?.message || 'Suggested creators temporarily unavailable.'),
      code: 'SOCIAL_CREATOR_BOOTSTRAP_ERROR'
    });
  }
});

app.get('/api/social/copy-traders', async (req, res, next) => {
  if (socialFeedService) {
    return next();
  }
  try {
    await socialFeedBootstrapInitPromise;
    const items = await socialFeedBootstrapService.getCopyTraders({
      limit: req.query?.limit
    });
    return res.json({
      success: true,
      source: 'bootstrap-fallback',
      items
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: String(error?.message || 'Copy traders temporarily unavailable.'),
      code: 'SOCIAL_TRADER_BOOTSTRAP_ERROR'
    });
  }
});

app.post('/api/social/creators/:creatorId/follow', async (req, res, next) => {
  if (socialFeedService) {
    return next();
  }
  try {
    await socialFeedBootstrapInitPromise;
    const authUser = await getP2PUserFromRequest(req).catch(() => null);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Login required to follow creators.',
        code: 'AUTH_REQUIRED'
      });
    }
    const result = await socialFeedBootstrapService.followCreator({
      authUser,
      creatorId: req.params.creatorId
    });
    return res.json({
      success: true,
      source: 'bootstrap-fallback',
      ...result
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: String(error?.message || 'Unable to follow creator right now.'),
      code: 'SOCIAL_FOLLOW_BOOTSTRAP_ERROR'
    });
  }
});

if (ENABLE_DEV_TEST_ROUTES) {
  app.get('/api/test/encryption', (req, res) => {
    try {
      const input = String(req.query.text || 'test-message');
      const encrypted = encryptText(input);
      const decrypted = decryptText(encrypted);

      return res.status(200).json({
        status: 'ok',
        input,
        encrypted,
        decrypted
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: String(error?.message || 'Encryption test failed')
      });
    }
  });
}

function registerShutdownHandlers() {
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      console.log(`${signal} received, shutting down HTTP server...`);

      if (bootRetryTimer) {
        clearTimeout(bootRetryTimer);
        bootRetryTimer = null;
      }

      if (p2pExpirySweepTimer) {
        clearInterval(p2pExpirySweepTimer);
        p2pExpirySweepTimer = null;
      }

      const forceExitTimer = setTimeout(() => {
        console.log('Shutdown timeout reached. Forcing process exit.');
        process.exit(0);
      }, 8000);
      if (typeof forceExitTimer.unref === 'function') {
        forceExitTimer.unref();
      }

      const finalizeShutdown = async () => {
        const closeTasks = [];

        if (userCenterStore && typeof userCenterStore.close === 'function') {
          closeTasks.push(
            userCenterStore.close().then(() => {
              console.log('[user-center] MySQL store closed.');
            })
          );
        }
        if (socialFeedStore && typeof socialFeedStore.close === 'function') {
          closeTasks.push(
            socialFeedStore.close().then(() => {
              console.log('[social-feed] MySQL store closed.');
            })
          );
        }
        if (otpAuthStore && typeof otpAuthStore.close === 'function') {
          closeTasks.push(
            otpAuthStore.close().then(() => {
              console.log('[auth-otp] MySQL store closed.');
            })
          );
        }

        let mongoClient = null;
        try {
          mongoClient = getMongoClient();
        } catch (error) {
          mongoClient = null;
        }
        if (mongoClient && typeof mongoClient.close === 'function') {
          closeTasks.push(
            mongoClient.close().then(() => {
              console.log('MongoDB client closed.');
            })
          );
        }

        await Promise.allSettled(closeTasks);
        clearTimeout(forceExitTimer);
        console.log('Shutdown complete.');
        process.exit(0);
      };

      if (!httpServer) {
        finalizeShutdown().catch(() => process.exit(0));
        return;
      }

      httpServer.close(() => {
        console.log('HTTP server closed.');
        finalizeShutdown().catch(() => process.exit(0));
      });
    });
  });
}

async function boot() {
  try {
    if (!httpServer) {
      httpServer = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
      });
      registerShutdownHandlers();
    }

    validateStartupConfig();
    tokenService.ensureJwtSecret();
    const mongoConfig = getMongoConfig();
    console.log(`MongoDB target URI: ${mongoConfig.maskedUri}`);
    console.log('Environment loader: dotenv');

    await connectToMongo();
    const collections = getCollections();
    repos = createRepositories(collections);
    auditLogService = createAuditLogService(collections);
    authEmailService = createAuthEmailService();
    p2pEmailService = createP2PEmailService();
    logEmailProviderRuntimeEnv();
    walletService = createWalletService(collections, getMongoClient(), {
      hooks: {
        afterOperation: async (payload) => {
          await auditLogService.safeLog({
            userId: String(payload?.userId || '').trim(),
            action: String(payload?.operation || 'wallet_operation_success').trim(),
            ipAddress: '',
            metadata: {
              success: true,
              amount: Number(payload?.amount || 0),
              referenceId: String(payload?.referenceId || '').trim(),
              counterpartyUserId: String(payload?.counterpartyUserId || '').trim(),
              ...((payload?.metadata && typeof payload.metadata === 'object') ? payload.metadata : {})
            }
          });
        },
        onOperationError: async (payload, error) => {
          await auditLogService.safeLog({
            userId: String(payload?.userId || '').trim(),
            action: String(payload?.operation || 'wallet_operation_failed').trim(),
            ipAddress: '',
            metadata: {
              success: false,
              amount: Number(payload?.amount || 0),
              referenceId: String(payload?.referenceId || '').trim(),
              counterpartyUserId: String(payload?.counterpartyUserId || '').trim(),
              errorCode: String(error?.code || 'WALLET_ERROR'),
              errorMessage: String(error?.message || 'Wallet operation failed')
            }
          });
        }
      }
    });
    p2pOrderExpiryService = createP2POrderExpiryService({ walletService });
    authMiddleware = createAuthMiddleware({
      verifyAccessToken: tokenService.verifyAccessToken,
      resolveLegacyUser: async (req) => {
        const legacyUser = await getP2PUserFromRequest(req);
        if (!legacyUser) {
          return null;
        }
        return {
          ...legacyUser,
          role: tokenService.normalizeRole(legacyUser.role || 'USER')
        };
      },
      resolveLegacyAdminSession: async (req) => {
        const cookies = parseCookies(req);
        const legacyToken = cookies[SESSION_COOKIE_NAME];
        return isSessionValid(legacyToken);
      }
    });

    const otpAuthConfig = readAuthOtpConfig();
    const geetestService = createGeetestService(otpAuthConfig.geetest);

    registerAuthRoutes(app, {
      repos,
      walletService,
      authMiddleware,
      tokenService,
      buildP2PUserFromEmail,
      createLegacyP2PUserSession: createP2PUserSession,
      setCookie,
      clearCookie,
      cookieNames: {
        accessToken: P2P_ACCESS_COOKIE_NAME,
        refreshToken: P2P_REFRESH_COOKIE_NAME,
        legacyP2PSession: P2P_USER_COOKIE_NAME
      },
      p2pUserTtlMs: P2P_USER_TTL_MS,
      auditLogService,
      authEmailService,
      captchaVerifier: geetestService,
      otpTtlMs: SIGNUP_OTP_TTL_MS,
      enableLegacyOtpEndpoints: false,
      onLoginSuccess: async ({ user, ipAddress, userAgent }) => {
        if (!userCenterService) {
          return;
        }
        await userCenterService.recordLoginEvent(user, {
          ip: ipAddress,
          device: userAgent
        });
      }
    });

    const buildFallbackOtpAuthService = () =>
      createRepoFallbackOtpAuthService({
        repos,
        tokenService,
        geetestService,
        authEmailService,
        buildP2PUserFromEmail,
        otpConfig: otpAuthConfig.otp
      });

    if (otpAuthConfig.mysql.enabled) {
      try {
        otpAuthStore = createMySqlAuthStore(otpAuthConfig.mysql);
        await otpAuthStore.initialize();
        const otpEmailService = createOtpEmailService(otpAuthConfig.smtp);
        otpAuthService = createOtpAuthService({
          store: otpAuthStore,
          geetestService,
          emailService: otpEmailService,
          tokenService,
          otpConfig: otpAuthConfig.otp
        });
        console.log('[auth-otp] Modular OTP auth enabled with MySQL + Geetest + SMTP');
      } catch (error) {
        otpAuthStore = null;
        otpAuthService = buildFallbackOtpAuthService();
        console.error(
          '[auth-otp] MySQL initialization failed. Falling back to repository OTP auth:',
          error?.message || error
        );
      }
    } else {
      otpAuthService = buildFallbackOtpAuthService();
      console.log('[auth-otp] MySQL config missing; fallback OTP auth enabled with repository store + Geetest + SMTP.');
    }

    registerOtpAuthRoutes(app, {
      otpAuthService,
      setCookie,
      tokenService,
      cookieNames: otpAuthConfig.cookieNames,
      isProduction: IS_PRODUCTION,
      onLoginSuccess: async ({ user, ipAddress, userAgent }) => {
        if (!userCenterService) {
          return;
        }
        await userCenterService.recordLoginEvent(user, {
          ip: ipAddress,
          device: userAgent
        });
      }
    });

    const userCenterConfig = readUserCenterConfig();
    if (userCenterConfig.mysql.enabled) {
      try {
        userCenterStore = createUserCenterStore(userCenterConfig.mysql);
        await userCenterStore.initialize();
        userCenterService = createUserCenterService({
          store: userCenterStore,
          config: userCenterConfig.app
        });
        console.log('[user-center] Modular User Center enabled');
      } catch (error) {
        userCenterStore = null;
        userCenterService = null;
        console.error(
          '[user-center] MySQL initialization failed. User Center APIs will run in degraded mode (503):',
          error?.message || error
        );
      }
    } else {
      console.log('[user-center] MySQL config missing; User Center APIs will return 503.');
    }

    registerUserCenterRoutes(app, {
      requiresP2PUser,
      userCenterService
    });

    const socialFeedConfig = readSocialFeedConfig();
    async function enableSocialFeedFallback(reason) {
      socialFeedStore = createSocialFeedFallbackStore();
      await socialFeedStore.initialize();
      socialFeedService = createSocialFeedService({
        store: socialFeedStore,
        config: socialFeedConfig.app
      });
      console.warn(`[social-feed] ${reason}. Using in-memory fallback store for live feed APIs.`);
    }

    if (socialFeedConfig.mysql.enabled) {
      try {
        socialFeedStore = createSocialFeedStore(socialFeedConfig.mysql);
        await socialFeedStore.initialize();
        socialFeedService = createSocialFeedService({
          store: socialFeedStore,
          config: socialFeedConfig.app
        });
        console.log('[social-feed] Social feed module enabled');
      } catch (error) {
        console.error(
          '[social-feed] MySQL initialization failed:',
          error?.message || error
        );
        await enableSocialFeedFallback('MySQL store unavailable');
      }
    } else {
      await enableSocialFeedFallback('MySQL config missing');
    }

    registerSocialFeedRoutes(app, {
      socialFeedService,
      requiresP2PUser,
      getP2PUserFromRequest,
      requiresAdminSession
    });

    p2pOrderController = createP2POrderController({
      repos,
      walletService,
      orderTtlMs: P2P_ORDER_TTL_MS,
      p2pEmailService,
      broadcastUserEvent
    });
    registerP2POrderRoutes(app, {
      requiresP2PUser,
      controller: p2pOrderController
    });

    adminStore = createAdminStore({
      collections,
      repos,
      walletService,
      tokenService,
      isDbConnected
    });

    adminAuthMiddleware = createAdminAuthMiddleware({
      adminStore,
      cookieNames: {
        accessToken: ADMIN_ACCESS_COOKIE_NAME,
        refreshToken: ADMIN_REFRESH_COOKIE_NAME
      }
    });

    adminControllers = createAdminControllers({
      adminStore,
      auth: adminAuthMiddleware,
      repos,
      setCookie,
      clearCookie,
      cookieNames: {
        accessToken: ADMIN_ACCESS_COOKIE_NAME,
        refreshToken: ADMIN_REFRESH_COOKIE_NAME
      },
      userCookieNames: {
        accessToken: P2P_ACCESS_COOKIE_NAME,
        refreshToken: P2P_REFRESH_COOKIE_NAME,
        legacyP2PSession: P2P_USER_COOKIE_NAME
      }
    });

    registerAdminRoutes(app, {
      adminStore,
      adminAuthMiddleware,
      adminControllers,
      auditLogService
    });

    const extendedStore = createAdminExtendedStore({ collections });
    registerAdminExtendedRoutes(app, {
      adminStore,
      extendedStore,
      adminAuthMiddleware
    });

    await repos.ensureIndexes();
    await adminStore.ensureIndexes();
    console.log('MongoDB indexes ensured');

    const migration = await repos.migrateLegacyLeadsJsonOnce(dataFile);
    if (migration.migrated) {
      console.log(`Legacy leads migration completed. Imported ${migration.imported || 0} rows.`);
    } else {
      console.log(`Legacy leads migration skipped (${migration.reason || 'n/a'}).`);
    }

    await repos.ensureSeedOffers([]);

    await adminStore.ensureDefaults();
    const enableDemoSeedData =
      String(process.env.ENABLE_DEMO_SEED_DATA || '')
        .trim()
        .toLowerCase() === 'true';
    if (enableDemoSeedData) {
      await adminStore.ensureDemoSupportTicket();
    }
    const seededAdmin = await adminStore.seedAdminUser({
      username: ADMIN_SEED_USERNAME,
      email: ADMIN_SEED_EMAIL,
      password: ADMIN_PASSWORD,
      role: ADMIN_SEED_ROLE,
      forcePasswordSync:
        String(process.env.ADMIN_FORCE_PASSWORD_SYNC || '')
          .trim()
          .toLowerCase() === 'true',
      forceRoleSync:
        String(process.env.ADMIN_FORCE_ROLE_SYNC || '')
          .trim()
          .toLowerCase() === 'true',
      forceActivate:
        String(process.env.ADMIN_FORCE_ACTIVATE || '')
          .trim()
          .toLowerCase() === 'true'
    });
    if (seededAdmin) {
      console.log(`Admin seed ensured for ${seededAdmin.email} (${seededAdmin.role})`);
    }

    app.use(apiNotFoundHandler);

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.use(errorHandler);

    if (p2pExpirySweepTimer) {
      clearInterval(p2pExpirySweepTimer);
    }
    p2pExpirySweepTimer = setInterval(async () => {
      try {
        const result = await p2pOrderExpiryService.runExpirySweep();
        if (result.cancelledCount > 0) {
          console.log(`Auto-cancelled expired P2P orders: ${result.cancelledCount}`);
        }
      } catch (error) {
        console.error('Failed to run P2P expiry sweep:', error.message);
      }
    }, P2P_EXPIRY_SWEEP_INTERVAL_MS);
    if (typeof p2pExpirySweepTimer.unref === 'function') {
      p2pExpirySweepTimer.unref();
    }

    persistenceReady = true;
    console.log(`MongoDB connected to ${mongoConfig.dbName}`);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    if (!IS_PRODUCTION && error.stack) {
      console.error(error.stack);
    }

    if (!persistenceReady && !bootRetryTimer) {
      bootRetryTimer = setTimeout(() => {
        bootRetryTimer = null;
        boot().catch((bootError) => {
          console.error('Boot retry failed:', bootError?.message || bootError);
        });
      }, 15000);
      if (typeof bootRetryTimer.unref === 'function') {
        bootRetryTimer.unref();
      }
      console.log('Will retry startup in 15 seconds...');
    }
  }
}

boot();
