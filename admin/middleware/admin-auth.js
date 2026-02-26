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

function getRequestIp(req) {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const firstForwarded = forwardedRaw.split(',')[0].trim();
  return firstForwarded || String(req.ip || req.connection?.remoteAddress || 'unknown');
}

function createAdminAuthMiddleware({ adminStore, cookieNames }) {
  const globalWhitelist = String(process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  function extractAccessToken(req) {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }

    const cookies = parseCookies(req);
    return String(cookies[cookieNames.accessToken] || '').trim();
  }

  function extractRefreshToken(req) {
    const bodyToken = String(req.body?.refreshToken || '').trim();
    if (bodyToken) {
      return bodyToken;
    }

    const cookies = parseCookies(req);
    return String(cookies[cookieNames.refreshToken] || '').trim();
  }

  function validateIpWhitelist(ip, adminRecord) {
    const perAdminWhitelist = Array.isArray(adminRecord?.ipWhitelist)
      ? adminRecord.ipWhitelist.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];

    const whitelist = perAdminWhitelist.length > 0 ? perAdminWhitelist : globalWhitelist;
    if (whitelist.length === 0) {
      return true;
    }
    return whitelist.includes(ip);
  }

  function requireAdmin(allowedRoles = []) {
    const normalizedAllowed = Array.isArray(allowedRoles)
      ? allowedRoles.map((role) => String(role || '').trim().toUpperCase()).filter(Boolean)
      : [];

    return async function adminAuthMiddleware(req, res, next) {
      const ip = getRequestIp(req);
      try {
        const accessToken = extractAccessToken(req);
        if (!accessToken) {
          return res.status(401).json({ message: 'Admin access token required.' });
        }

        const sessionData = await adminStore.verifyAdminAccessToken(accessToken);
        const admin = sessionData.admin;

        if (!validateIpWhitelist(ip, admin)) {
          return res.status(403).json({ message: 'IP not allowed for admin access.' });
        }

        if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(String(admin.role || '').toUpperCase())) {
          return res.status(403).json({ message: 'Insufficient admin role permission.' });
        }

        req.adminAuth = {
          adminId: admin.id,
          adminEmail: admin.email,
          adminRole: admin.role,
          sessionId: sessionData.session.id,
          ip,
          userAgent: String(req.headers['user-agent'] || '')
        };

        return next();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired admin token.' });
      }
    };
  }

  return {
    parseCookies,
    getRequestIp,
    extractAccessToken,
    extractRefreshToken,
    validateIpWhitelist,
    requireAdmin
  };
}

module.exports = {
  createAdminAuthMiddleware
};
