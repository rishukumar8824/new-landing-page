const GENERAL_WINDOW_MS = Math.max(
  1_000,
  Number.parseInt(String(process.env.API_RATE_LIMIT_WINDOW_MS || '60000'), 10) || 60000
);
const GENERAL_MAX_REQUESTS = Math.max(
  1,
  Number.parseInt(String(process.env.API_RATE_LIMIT_MAX || '120'), 10) || 120
);

const WITHDRAW_WINDOW_MS = Math.max(
  1_000,
  Number.parseInt(String(process.env.WITHDRAW_RATE_LIMIT_WINDOW_MS || '60000'), 10) || 60000
);
const WITHDRAW_MAX_REQUESTS = Math.max(
  1,
  Number.parseInt(String(process.env.WITHDRAW_RATE_LIMIT_MAX || '10'), 10) || 10
);

const store = new Map();

const getRequestIp = (req) => {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const forwardedIp = forwardedRaw.split(',')[0].trim();
  return forwardedIp || String(req.ip || req.connection?.remoteAddress || '').trim() || 'unknown';
};

const getUserKey = (req) => {
  const userId = req?.user?.id || req?.auth?.id || req?.body?.user_id;
  return userId ? `user:${userId}` : `ip:${getRequestIp(req)}`;
};

const purgeExpired = (now) => {
  for (const [key, state] of store.entries()) {
    if (!state || now >= state.resetAt) {
      store.delete(key);
    }
  }
};

const applyRateLimit = ({ req, res, next, scope, windowMs, maxRequests, key }) => {
  const now = Date.now();
  const compositeKey = `${scope}:${key}`;

  const current = store.get(compositeKey);
  if (!current || now >= current.resetAt) {
    store.set(compositeKey, {
      count: 1,
      resetAt: now + windowMs
    });

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

    if (Math.random() < 0.01) {
      purgeExpired(now);
    }

    return next();
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again shortly.',
      data: {
        scope,
        retry_after_seconds: retryAfterSeconds
      }
    });
  }

  current.count += 1;
  store.set(compositeKey, current);

  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

  return next();
};

export const generalApiLimiter = (req, res, next) => {
  return applyRateLimit({
    req,
    res,
    next,
    scope: 'general_api',
    windowMs: GENERAL_WINDOW_MS,
    maxRequests: GENERAL_MAX_REQUESTS,
    key: getUserKey(req)
  });
};

export const strictWithdrawLimiter = (req, res, next) => {
  const userKey = req?.user?.id ? `user:${req.user.id}` : `ip:${getRequestIp(req)}`;

  return applyRateLimit({
    req,
    res,
    next,
    scope: 'withdraw_strict',
    windowMs: WITHDRAW_WINDOW_MS,
    maxRequests: WITHDRAW_MAX_REQUESTS,
    key: userKey
  });
};

export const createScopedLimiter = ({ scope, windowMs, maxRequests, keyFn }) => {
  const normalizedScope = String(scope || 'custom').trim() || 'custom';
  const normalizedWindowMs = Math.max(1_000, Number(windowMs) || 60_000);
  const normalizedMax = Math.max(1, Number(maxRequests) || 60);

  return (req, res, next) => {
    const key = typeof keyFn === 'function' ? String(keyFn(req) || '').trim() : getUserKey(req);
    return applyRateLimit({
      req,
      res,
      next,
      scope: normalizedScope,
      windowMs: normalizedWindowMs,
      maxRequests: normalizedMax,
      key: key || 'unknown'
    });
  };
};

export default {
  generalApiLimiter,
  strictWithdrawLimiter,
  createScopedLimiter
};
