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

function extractAccessTokenFromRequest(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookies = parseCookies(req);
  return (
    String(cookies.access_token || '').trim() ||
    String(cookies.p2p_access_token || '').trim() ||
    String(cookies.admin_access_token || '').trim()
  );
}

function extractRefreshTokenFromRequest(req) {
  const bodyRefreshToken = String(req.body?.refreshToken || '').trim();
  if (bodyRefreshToken) {
    return bodyRefreshToken;
  }

  const cookies = parseCookies(req);
  return (
    String(cookies.refresh_token || '').trim() ||
    String(cookies.p2p_refresh_token || '').trim() ||
    String(cookies.admin_refresh_token || '').trim()
  );
}

function normalizeRole(role) {
  return String(role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function toAuthUser(input = {}) {
  return {
    id: String(input.id || input.userId || input.sub || '').trim(),
    username: String(input.username || '').trim(),
    email: String(input.email || '')
      .trim()
      .toLowerCase(),
    role: normalizeRole(input.role)
  };
}

function createAuthMiddleware(options = {}) {
  const {
    verifyAccessToken,
    resolveLegacyUser,
    resolveLegacyAdminSession
  } = options;

  if (typeof verifyAccessToken !== 'function') {
    throw new Error('verifyAccessToken function is required');
  }

  function requireAuth(config = {}) {
    const allowedRoles = Array.isArray(config.roles) && config.roles.length > 0 ? config.roles.map(normalizeRole) : ['USER', 'ADMIN'];
    const allowLegacy = config.allowLegacy !== false;

    return async function authMiddleware(req, res, next) {
      const accessToken = extractAccessTokenFromRequest(req);
      let authUser = null;
      let jwtValidationFailed = false;

      if (accessToken) {
        try {
          const decoded = verifyAccessToken(accessToken);
          if (String(decoded?.typ || 'access').trim().toLowerCase() !== 'access') {
            return res.status(401).json({ message: 'Invalid access token.' });
          }

          authUser = toAuthUser({
            id: decoded.sub,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
          });
        } catch (error) {
          jwtValidationFailed = true;
          if (!allowLegacy) {
            return res.status(401).json({ message: 'Invalid or expired access token.' });
          }
        }
      }

      if (!authUser && allowLegacy && typeof resolveLegacyUser === 'function') {
        const legacyUser = await resolveLegacyUser(req);
        if (legacyUser) {
          authUser = toAuthUser({
            id: legacyUser.id,
            username: legacyUser.username,
            email: legacyUser.email,
            role: legacyUser.role || 'USER'
          });
        }
      }

      if (!authUser || !authUser.id) {
        if (jwtValidationFailed) {
          return res.status(401).json({ message: 'Invalid or expired access token.' });
        }
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!allowedRoles.includes(authUser.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.authUser = authUser;
      req.p2pUser = {
        id: authUser.id,
        username: authUser.username,
        email: authUser.email,
        role: authUser.role
      };
      return next();
    };
  }

  function requireAdmin(config = {}) {
    const allowLegacy = config.allowLegacy !== false;

    return async function adminMiddleware(req, res, next) {
      const accessToken = extractAccessTokenFromRequest(req);
      let jwtValidationFailed = false;

      if (accessToken) {
        try {
          const decoded = verifyAccessToken(accessToken);
          if (String(decoded?.typ || 'access').trim().toLowerCase() !== 'access') {
            return res.status(401).json({ message: 'Invalid access token.' });
          }
          const authUser = toAuthUser({
            id: decoded.sub,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
          });
          if (authUser.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }
          req.authUser = authUser;
          return next();
        } catch (error) {
          jwtValidationFailed = true;
          if (!allowLegacy) {
            return res.status(401).json({ message: 'Invalid or expired access token.' });
          }
        }
      }

      if (allowLegacy && typeof resolveLegacyAdminSession === 'function') {
        const isLegacyAdmin = await resolveLegacyAdminSession(req);
        if (isLegacyAdmin) {
          req.authUser = toAuthUser({
            id: 'admin_legacy',
            username: 'admin',
            role: 'ADMIN'
          });
          return next();
        }
      }

      if (jwtValidationFailed) {
        return res.status(401).json({ message: 'Invalid or expired access token.' });
      }
      return res.status(401).json({ message: 'Unauthorized' });
    };
  }

  return {
    requireAuth,
    requireAdmin,
    parseCookies,
    extractAccessTokenFromRequest,
    extractRefreshTokenFromRequest
  };
}

module.exports = {
  createAuthMiddleware
};
