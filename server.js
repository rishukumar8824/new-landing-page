require('dotenv').config({ override: true });

const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const { connectToMongo, getCollections, getMongoClient, getMongoConfig, isDbConnected } = require('./lib/db');
const { createRepositories } = require('./lib/repositories');
const { createWalletService, makeSeedUserId } = require('./lib/wallet-service');
const { createAuthMiddleware } = require('./middleware/auth');
const { registerAuthRoutes } = require('./routes/auth');
const tokenService = require('./services/tokenService');
const { createAdminStore } = require('./admin/services/admin-store');
const { createAdminAuthMiddleware } = require('./admin/middleware/admin-auth');
const { createAdminControllers } = require('./admin/controllers/admin-controller');
const { registerAdminRoutes } = require('./admin/routes/admin-routes');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10);

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
const SIGNUP_OTP_TTL_MS = 1000 * 60 * 10;
const P2P_ORDER_ACTIVE_STATUSES = ['PENDING', 'PAID', 'DISPUTED'];
const IS_PRODUCTION = String(process.env.NODE_ENV || '')
  .trim()
  .toLowerCase() === 'production';
const ALLOW_DEMO_OTP =
  String(process.env.ALLOW_DEMO_OTP || '')
    .trim()
    .toLowerCase() === 'true' || !IS_PRODUCTION;

const p2pOrderStreams = new Map();
const DEFAULT_TICKER_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
const DEFAULT_SYMBOL_PRICES = {
  BTCUSDT: 63000,
  ETHUSDT: 3200,
  BNBUSDT: 590,
  XRPUSDT: 0.62,
  SOLUSDT: 145,
  ADAUSDT: 0.78
};

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'leads.json');
const seedBuyOffers = [
  { advertiser: 'TecnoSeller', price: 98.19, available: 213.9145, minLimit: 1900, maxLimit: 21004, completionRate: 100, orders: 756, payments: ['Digital eRupee'] },
  { advertiser: 'suraj12', price: 96.1, available: 87.8692, minLimit: 8400, maxLimit: 8444, completionRate: 100, orders: 1, payments: ['UPI'] },
  { advertiser: 'lamohitverma786', price: 96.2, available: 790, minLimit: 70000, maxLimit: 73000, completionRate: 100, orders: 105, payments: ['Cash Deposit', 'Bank'] },
  { advertiser: 'CryptoDeskPro', price: 96.32, available: 5250, minLimit: 500, maxLimit: 100000, completionRate: 99.2, orders: 1893, payments: ['UPI', 'IMPS'] },
  { advertiser: 'SecureTrades', price: 96.38, available: 11800, minLimit: 1000, maxLimit: 200000, completionRate: 98.5, orders: 2144, payments: ['Bank Transfer', 'NEFT'] },
  { advertiser: 'QuickUPIHub', price: 96.42, available: 3200, minLimit: 300, maxLimit: 50000, completionRate: 97.8, orders: 911, payments: ['UPI', 'Paytm'] },
  { advertiser: 'INRMerchantOne', price: 96.48, available: 6450, minLimit: 1500, maxLimit: 95000, completionRate: 98.2, orders: 804, payments: ['UPI', 'IMPS'] },
  { advertiser: 'FastBankDesk', price: 96.55, available: 9200, minLimit: 2000, maxLimit: 130000, completionRate: 99.1, orders: 1488, payments: ['Bank Transfer', 'NEFT'] },
  { advertiser: 'UPIPrimeHub', price: 96.63, available: 2750, minLimit: 500, maxLimit: 45000, completionRate: 97.9, orders: 506, payments: ['UPI'] },
  { advertiser: 'TrustP2PIndia', price: 96.71, available: 15800, minLimit: 2500, maxLimit: 250000, completionRate: 99.4, orders: 2871, payments: ['UPI', 'RTGS', 'NEFT'] }
];

const seedSellOffers = [
  { advertiser: 'AlphaBuyer', price: 95.9, available: 7100, minLimit: 500, maxLimit: 150000, completionRate: 99.1, orders: 1440, payments: ['UPI', 'Bank Transfer'] },
  { advertiser: 'MarketMitra', price: 95.84, available: 4500, minLimit: 1000, maxLimit: 120000, completionRate: 98.9, orders: 1320, payments: ['IMPS', 'NEFT'] },
  { advertiser: 'SellNowDesk', price: 95.8, available: 8800, minLimit: 1200, maxLimit: 98000, completionRate: 98.7, orders: 1218, payments: ['UPI', 'IMPS'] },
  { advertiser: 'INRBridgePro', price: 95.76, available: 11200, minLimit: 5000, maxLimit: 180000, completionRate: 99.2, orders: 1642, payments: ['Bank Transfer', 'NEFT'] },
  { advertiser: 'QuickSettlement', price: 95.72, available: 2600, minLimit: 700, maxLimit: 60000, completionRate: 97.5, orders: 412, payments: ['UPI', 'Paytm'] },
  { advertiser: 'PrimeCashflow', price: 95.68, available: 3900, minLimit: 1000, maxLimit: 74000, completionRate: 98.8, orders: 879, payments: ['UPI'] },
  { advertiser: 'NeonExchangeIN', price: 95.64, available: 6200, minLimit: 2000, maxLimit: 90000, completionRate: 98.1, orders: 953, payments: ['IMPS', 'NEFT'] },
  { advertiser: 'USDTLiquidDesk', price: 95.58, available: 10300, minLimit: 1500, maxLimit: 170000, completionRate: 99, orders: 1701, payments: ['Bank Transfer', 'RTGS'] },
  { advertiser: 'RupeeRouteX', price: 95.53, available: 5100, minLimit: 900, maxLimit: 85000, completionRate: 97.6, orders: 693, payments: ['UPI', 'IMPS'] },
  { advertiser: 'BharatP2PLine', price: 95.48, available: 7400, minLimit: 1200, maxLimit: 115000, completionRate: 98.4, orders: 1182, payments: ['UPI', 'NEFT'] }
];

const seedP2POffers = [
  ...seedBuyOffers.map((offer, index) => ({
    id: `ofr_${1001 + index}`,
    side: 'buy',
    asset: 'USDT',
    ...offer
  })),
  ...seedSellOffers.map((offer, index) => ({
    id: `ofr_${1011 + index}`,
    side: 'sell',
    asset: 'USDT',
    ...offer
  }))
];

let repos = null;
let walletService = null;
let authMiddleware = null;
let adminStore = null;
let adminAuthMiddleware = null;
let adminControllers = null;
let persistenceReady = false;
let httpServer = null;
let shuttingDown = false;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readLeads() {
  if (!repos) {
    throw new Error('Persistence layer not initialized');
  }
  return repos.getLeadsLatest();
}

function validateStartupConfig() {
  const missing = [];
  if (!String(process.env.MONGODB_URI || '').trim()) {
    missing.push('MONGODB_URI');
  }
  if (!String(process.env.JWT_SECRET || '').trim()) {
    missing.push('JWT_SECRET');
  }
  if (!Number.isFinite(PORT) || PORT <= 0) {
    missing.push('PORT');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Configure them in .env file.`);
  }

  if (!String(process.env.ADMIN_USERNAME || '').trim()) {
    console.warn('ADMIN_USERNAME not set. Using default "admin".');
  }
  if (!String(process.env.ADMIN_PASSWORD || '').trim()) {
    console.warn('ADMIN_PASSWORD not set. Using default "admin123".');
  }
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
  const subject = 'Your TradeNova verification code';
  const text = `Your verification code is ${code}. This code expires in 10 minutes.`;
  const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`;

  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  const resendFromEmail = String(process.env.RESEND_FROM_EMAIL || '').trim();
  if (resendApiKey && resendFromEmail) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [email],
          subject,
          html
        })
      });

      if (response.ok) {
        return { delivered: true, reason: 'sent_via_resend' };
      }

      const errorText = await response.text();
      return { delivered: false, reason: `resend_error:${errorText}` };
    } catch (error) {
      return { delivered: false, reason: `resend_error:${error.message}` };
    }
  }

  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpPortRaw = String(process.env.SMTP_PORT || '').trim();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  const smtpFromEmail = String(process.env.SMTP_FROM_EMAIL || '').trim();
  const smtpSecureRaw = String(process.env.SMTP_SECURE || '')
    .trim()
    .toLowerCase();

  const gmailUser = String(process.env.GMAIL_USER || '').trim();
  const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').trim();

  let transporter = null;
  let fromEmail = '';

  if (smtpHost && smtpUser && smtpPass) {
    const parsedPort = Number.parseInt(smtpPortRaw || '587', 10);
    const smtpPort = Number.isFinite(parsedPort) ? parsedPort : 587;
    const secure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    fromEmail = smtpFromEmail || smtpUser;
  } else if (gmailUser && gmailAppPassword) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });
    fromEmail = smtpFromEmail || gmailUser;
  }

  if (!transporter || !fromEmail) {
    return { delivered: false, reason: 'missing_email_provider_config' };
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      text,
      html
    });
    return { delivered: true, reason: 'sent_via_smtp' };
  } catch (error) {
    return { delivered: false, reason: `smtp_error:${error.message}` };
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
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000
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

function createOrderReference() {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `P2P-${Date.now().toString().slice(-6)}-${randomPart}`;
}

function findOfferById(offerId) {
  return repos.getOfferById(offerId);
}

function createOfferId() {
  return repos.nextCounterValue('p2p_offer_seq').then((sequence) => `ofr_${sequence}`);
}

function findOrderByReference(reference) {
  return repos.getP2POrderByReference(reference);
}

function resolveOfferOwner(offer) {
  const ownerId = String(offer?.createdByUserId || '').trim() || makeSeedUserId(offer?.advertiser);
  const ownerUsername = String(offer?.createdByUsername || offer?.advertiser || ownerId).trim();
  return {
    id: ownerId,
    username: ownerUsername
  };
}

function buildOrderParticipants({ sellerId, sellerUsername, buyerId, buyerUsername }) {
  return [
    { id: buyerId, username: buyerUsername, role: 'buyer' },
    { id: sellerId, username: sellerUsername, role: 'seller' }
  ];
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
    paymentMethod: order.paymentMethod,
    participants: order.participants,
    participantsLabel: getParticipantsText(order),
    sellerUserId: order.sellerUserId,
    sellerUsername: order.sellerUsername,
    buyerUserId: order.buyerUserId,
    buyerUsername: order.buyerUsername,
    escrowAmount: order.escrowAmount,
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
  return messages.map((msg) => ({
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    createdAt: new Date(msg.createdAt).toISOString()
  }));
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
  const ipCheck = loginAttemptLimiter(`p2p_login:${getRequestIp(req)}`);
  if (!ipCheck.allowed) {
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
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const existingCredential = await repos.getP2PCredential(email);
    if (existingCredential && !repos.verifyPassword(password, existingCredential.passwordHash)) {
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

    return res.json({
      message: 'P2P login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken
    });
  } catch (error) {
    clearP2PAuthCookies(res);
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

  let delivery = 'simulated';
  let deliveryMessage = 'Verification code generated.';

  if (contactInfo.type === 'email') {
    const sendResult = await trySendSignupEmailOtp(contactInfo.value, code);
    if (sendResult.delivered) {
      delivery = 'email';
      deliveryMessage = 'Verification code sent to your email.';
    } else {
      if (!ALLOW_DEMO_OTP) {
        await repos.deleteSignupOtp(contactInfo.value);
        return res.status(503).json({
          message:
            'Email OTP service is not configured. Set RESEND or SMTP env vars, then redeploy.',
          reason: sendResult.reason
        });
      }
      delivery = 'simulated';
      deliveryMessage = 'Email provider not configured, using demo verification code.';
    }
  } else {
    if (!ALLOW_DEMO_OTP) {
      await repos.deleteSignupOtp(contactInfo.value);
      return res.status(503).json({
        message: 'SMS OTP service is not configured.',
        reason: 'missing_sms_provider_config'
      });
    }
    deliveryMessage = 'SMS provider not configured, using demo verification code.';
  }

  const payload = {
    message: deliveryMessage,
    contactType: contactInfo.type,
    expiresInSeconds: Math.floor(SIGNUP_OTP_TTL_MS / 1000),
    delivery
  };

  if (delivery !== 'email' && ALLOW_DEMO_OTP) {
    payload.devCode = code;
  }

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

  return res.json({
    loggedIn: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: tokenService.normalizeRole(user.role || 'USER')
    }
  });
});

app.get('/api/p2p/wallet', requiresP2PUser, async (req, res) => {
  try {
    const ensured = await walletService.ensureWallet(req.p2pUser.id, {
      username: req.p2pUser.username
    });
    return res.json({
      wallet: ensured
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while loading wallet.' });
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

  const normalizedSide = side === 'sell' ? 'sell' : 'buy';

  try {
    const allOffers = await repos.listOffers({ side: normalizedSide, asset });
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

    return res.json({
      side: normalizedSide,
      asset,
      total: filtered.length,
      updatedAt: new Date().toISOString(),
      offers: filtered
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching offers.' });
  }
});

app.post('/api/p2p/offers', requiresP2PUser, async (req, res) => {
  const asset = String(req.body.asset || '').trim().toUpperCase();
  const adType = String(req.body.adType || 'sell').trim().toLowerCase();
  const price = Number(req.body.price || 0);
  const available = Number(req.body.available || 0);
  const minLimit = Number(req.body.minLimit || 0);
  const maxLimit = Number(req.body.maxLimit || 0);
  const rawPayments = Array.isArray(req.body.payments) ? req.body.payments : [];

  if (!['USDT', 'BTC', 'ETH'].includes(asset)) {
    return res.status(400).json({ message: 'Asset must be USDT, BTC or ETH.' });
  }

  if (!['sell', 'buy'].includes(adType)) {
    return res.status(400).json({ message: 'adType must be either sell or buy.' });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ message: 'Price must be greater than 0.' });
  }

  if (!Number.isFinite(available) || available <= 0) {
    return res.status(400).json({ message: 'Available quantity must be greater than 0.' });
  }

  if (!Number.isFinite(minLimit) || !Number.isFinite(maxLimit) || minLimit <= 0 || maxLimit < minLimit) {
    return res.status(400).json({ message: 'Enter valid min/max limits.' });
  }

  const payments = rawPayments
    .map((method) => String(method).trim())
    .filter((method) => method.length > 0)
    .slice(0, 4);

  if (payments.length === 0) {
    return res.status(400).json({ message: 'Add at least one payment method.' });
  }

  const takerActionSide = adType === 'sell' ? 'buy' : 'sell';
  const normalizedPrice = Number(price.toFixed(asset === 'USDT' ? 2 : 0));
  const normalizedAvailable = Number(available.toFixed(asset === 'USDT' ? 2 : 6));

  try {
    const newOffer = {
      id: await createOfferId(),
      side: takerActionSide,
      asset,
      advertiser: req.p2pUser.username,
      price: normalizedPrice,
      available: normalizedAvailable,
      minLimit: Math.floor(minLimit),
      maxLimit: Math.floor(maxLimit),
      completionRate: 100,
      orders: 0,
      payments,
      createdByUserId: req.p2pUser.id,
      createdByUsername: req.p2pUser.username,
      adType
    };

    const savedOffer = await repos.createOffer(newOffer);

    return res.status(201).json({
      message: 'Ad created successfully.',
      offer: savedOffer
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while creating ad.' });
  }
});

app.post('/api/p2p/orders', requiresP2PUser, async (req, res) => {
  const offerId = String(req.body.offerId || '').trim();
  const amountInr = Number(req.body.amountInr || 0);
  const selectedPaymentMethod = String(req.body.paymentMethod || '').trim();

  const offer = await findOfferById(offerId);

  if (!offer) {
    return res.status(404).json({ message: 'Offer not found.' });
  }

  if (offer.createdByUserId && offer.createdByUserId === req.p2pUser.id) {
    return res.status(400).json({ message: 'You cannot create order on your own ad.' });
  }

  const fallbackAmount = offer.minLimit;
  const finalAmount = Number.isFinite(amountInr) && amountInr > 0 ? amountInr : fallbackAmount;

  if (finalAmount < offer.minLimit || finalAmount > offer.maxLimit) {
    return res.status(400).json({
      message: `Amount must be between ₹${offer.minLimit.toLocaleString('en-IN')} and ₹${offer.maxLimit.toLocaleString('en-IN')}.`
    });
  }

  const exactPayment = offer.payments.find((method) => method.toLowerCase() === selectedPaymentMethod.toLowerCase());
  if (selectedPaymentMethod && !exactPayment) {
    return res.status(400).json({ message: 'Selected payment method is not available for this ad.' });
  }
  const paymentMethod = exactPayment || offer.payments[0];

  const assetAmount = finalAmount / offer.price;
  const now = Date.now();
  const owner = resolveOfferOwner(offer);
  const buyer = offer.side === 'buy' ? req.p2pUser : { id: owner.id, username: owner.username };
  const seller = offer.side === 'buy' ? { id: owner.id, username: owner.username } : req.p2pUser;

  if (buyer.id === seller.id) {
    return res.status(400).json({ message: 'Buyer and seller cannot be same account.' });
  }

  const participants = buildOrderParticipants({
    sellerId: seller.id,
    sellerUsername: seller.username,
    buyerId: buyer.id,
    buyerUsername: buyer.username
  });

  const order = {
    id: `ord_${now}_${Math.floor(Math.random() * 10000)}`,
    reference: createOrderReference(),
    offerId: offer.id,
    side: offer.side,
    asset: offer.asset,
    advertiser: offer.advertiser,
    paymentMethod,
    price: offer.price,
    amountInr: Number(finalAmount.toFixed(2)),
    assetAmount: Number(assetAmount.toFixed(6)),
    escrowAmount: Number(assetAmount.toFixed(6)),
    sellerUserId: seller.id,
    sellerUsername: seller.username,
    buyerUserId: buyer.id,
    buyerUsername: buyer.username,
    createdAt: now,
    expiresAt: now + P2P_ORDER_TTL_MS,
    updatedAt: now,
    status: 'PENDING',
    participants,
    messages: [
      {
        id: `msg_${now}_welcome`,
        sender: 'System',
        text: 'Order created. Escrow locked from seller wallet. Complete payment before timer ends.',
        createdAt: now
      }
    ]
  };

  try {
    const savedOrder = await walletService.createEscrowOrder(order);
    return res.status(201).json({
      message: 'Order created successfully.',
      order: normalizeOrderState(savedOrder)
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === 'SELLER_ALREADY_HAS_ACTIVE_ORDER') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error while creating order.' });
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

  if (!text) {
    return res.status(400).json({ message: 'Message text is required.' });
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
      next.messages.push({
        id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
        sender: req.p2pUser.username,
        text,
        createdAt: now
      });
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

app.get('/admin-login', (req, res) => {
  return res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
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

app.get('/p2p', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'p2p.html'));
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
  if (!persistenceReady || !isDbConnected()) {
    return res.status(503).json({ status: 'error', db: 'disconnected' });
  }
  return res.status(200).json({ status: 'ok', db: 'connected' });
});

async function boot() {
  try {
    validateStartupConfig();
    tokenService.ensureJwtSecret();
    const mongoConfig = getMongoConfig();
    console.log(`MongoDB target URI: ${mongoConfig.maskedUri}`);
    console.log('Environment loader: dotenv');

    await connectToMongo();
    const collections = getCollections();
    repos = createRepositories(collections);
    walletService = createWalletService(collections, getMongoClient());
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
      p2pUserTtlMs: P2P_USER_TTL_MS
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
      }
    });

    registerAdminRoutes(app, {
      adminStore,
      adminAuthMiddleware,
      adminControllers
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

    const seedInfo = await repos.ensureSeedOffers(seedP2POffers);
    if (seedInfo.seeded) {
      console.log(`P2P offers seeded: ${seedInfo.count}`);
    } else {
      console.log(`P2P offers already present: ${seedInfo.count}`);
    }

    const walletSeedInfo = await walletService.ensureSeedWallets(seedP2POffers);
    console.log(`Wallets ensured for seed advertisers: ${walletSeedInfo.ensured}`);

    await adminStore.ensureDefaults();
    await adminStore.ensureDemoSupportTicket();
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

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    setInterval(async () => {
      try {
        const result = await walletService.expireOrders();
        if (result.expired > 0) {
          console.log(`Auto-expired P2P orders: ${result.expired}`);
        }
      } catch (error) {
        console.error('Failed to run P2P expiry sweep:', error.message);
      }
    }, P2P_EXPIRY_SWEEP_INTERVAL_MS);

    persistenceReady = true;
    httpServer = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`MongoDB connected to ${mongoConfig.dbName}`);
    });

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, () => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        console.log(`${signal} received, shutting down HTTP server...`);

        if (!httpServer) {
          return;
        }

        httpServer.close(() => {
          console.log('HTTP server closed.');
        });

        // Ensure shutdown does not hang forever.
        setTimeout(() => {
          console.log('Shutdown timeout reached.');
        }, 8000).unref();
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    if (!IS_PRODUCTION && error.stack) {
      console.error(error.stack);
    }
  }
}

boot();
