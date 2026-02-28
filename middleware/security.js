let helmetFactory = null;
let rateLimitFactory = null;

try {
  helmetFactory = require('helmet');
} catch (error) {
  helmetFactory = null;
}

try {
  rateLimitFactory = require('express-rate-limit');
} catch (error) {
  rateLimitFactory = null;
}

function createFallbackRateLimiter({ windowMs, max, message }) {
  const state = new Map();

  return function fallbackRateLimiter(req, res, next) {
    const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
    const ip = forwardedRaw.split(',')[0].trim() || String(req.ip || req.connection?.remoteAddress || 'unknown');
    const now = Date.now();
    const existing = state.get(ip);

    if (!existing || now > existing.resetAt) {
      state.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message,
        retryAfterSeconds
      });
    }

    existing.count += 1;
    state.set(ip, existing);
    return next();
  };
}

function buildRateLimiter({ windowMs, max, message }) {
  if (!rateLimitFactory) {
    return createFallbackRateLimiter({ windowMs, max, message });
  }

  return rateLimitFactory({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (req, res) => {
      const retryAfterFromHeader = Number(res.getHeader('Retry-After'));
      const retryAfterFromRateLimit = req?.rateLimit?.resetTime
        ? Math.max(
            1,
            Math.ceil((new Date(req.rateLimit.resetTime).getTime() - Date.now()) / 1000)
          )
        : undefined;
      const retryAfterSeconds = Number.isFinite(retryAfterFromHeader)
        ? retryAfterFromHeader
        : retryAfterFromRateLimit;
      return res.status(429).json({
        message,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {})
      });
    }
  });
}

function createRateLimiters() {
  return {
    global: buildRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 600,
      message: 'Too many requests. Please try again in a few minutes.'
    }),
    login: buildRateLimiter({
      windowMs: 10 * 60 * 1000,
      max: 5,
      message: 'Too many login attempts. Please try again later.'
    }),
    otp: buildRateLimiter({
      windowMs: 10 * 60 * 1000,
      max: 5,
      message: 'Too many OTP requests. Please try again later.'
    }),
    withdrawal: buildRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 3,
      message: 'Too many withdrawal attempts. Please try again later.'
    })
  };
}

function applySecurityHeaders(app) {
  app.disable('x-powered-by');

  let helmetMounted = false;
  if (helmetFactory) {
    try {
      app.use(
        helmetFactory({
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https://api.binance.com', 'https://api.resend.com'],
              fontSrc: ["'self'", 'https:', 'data:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"]
            }
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          },
          frameguard: { action: 'deny' },
          hidePoweredBy: true,
          noSniff: true,
          referrerPolicy: { policy: 'no-referrer' }
        })
      );
      helmetMounted = true;
    } catch (error) {
      // Fallback to manual headers below.
    }
  }

  if (!helmetMounted) {
    app.use(
      (req, res, next) => {
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' https://api.binance.com https://api.resend.com; font-src 'self' https: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
        );
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
      }
    );
  } else {
    app.use((req, res, next) => {
      // Retained for older clients even when Helmet is active.
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }
}

function applySecurityHardening(app) {
  const limiters = createRateLimiters();
  applySecurityHeaders(app);

  // Scope global limiter to API endpoints to avoid throttling normal page/assets rendering.
  app.use('/api', limiters.global);
  app.use(['/auth/login', '/auth/register', '/api/p2p/login', '/api/admin/auth/login', '/api/admin/login'], limiters.login);
  app.use(['/api/signup/send-code', '/api/signup/verify-code'], limiters.otp);
  app.use(['/api/withdrawals', '/api/admin/wallet/withdrawals'], limiters.withdrawal);

  return limiters;
}

module.exports = {
  applySecurityHardening,
  createRateLimiters
};
