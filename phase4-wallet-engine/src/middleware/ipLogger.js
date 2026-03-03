import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const LOGIN_PATH_REGEX = /(login|signin|auth\/login)/i;

const getRequestIp = (req) => {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const forwardedIp = forwardedRaw.split(',')[0].trim();
  return forwardedIp || String(req.ip || req.connection?.remoteAddress || '').trim() || 'unknown';
};

const extractUserId = (req, res) => {
  const value =
    req?.user?.id ||
    res?.locals?.user_id ||
    req?.auth?.id ||
    req?.body?.user_id ||
    req?.body?.id ||
    req?.params?.userId;

  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const shouldLogRequest = (req) => {
  const path = String(req?.originalUrl || req?.path || '').trim();
  return LOGIN_PATH_REGEX.test(path);
};

const isMissingTableError = (error) => {
  const code = String(error?.original?.code || error?.code || '').trim();
  return code === 'ER_NO_SUCH_TABLE';
};

export const logLoginIp = async ({ userId, ipAddress, userAgent, endpoint, method, statusCode }) => {
  const normalizedUserId = Number.parseInt(String(userId || ''), 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return false;
  }

  try {
    await sequelize.query(
      `INSERT INTO login_logs
        (user_id, ip_address, user_agent, endpoint, method, status_code, created_at)
       VALUES
        (:userId, :ipAddress, :userAgent, :endpoint, :method, :statusCode, NOW())`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          userId: normalizedUserId,
          ipAddress: String(ipAddress || '').slice(0, 64) || 'unknown',
          userAgent: String(userAgent || '').slice(0, 512),
          endpoint: String(endpoint || '').slice(0, 255),
          method: String(method || '').slice(0, 16),
          statusCode: Number.isFinite(Number(statusCode)) ? Number(statusCode) : 0
        }
      }
    );

    return true;
  } catch (error) {
    if (isMissingTableError(error)) {
      return false;
    }

    console.error('[ip-logger] failed to persist login log', {
      userId: normalizedUserId,
      message: error.message
    });
    return false;
  }
};

export const ipLogger = (req, res, next) => {
  if (!shouldLogRequest(req)) {
    return next();
  }

  const ipAddress = getRequestIp(req);
  const endpoint = String(req.originalUrl || req.path || '').trim();
  const method = String(req.method || '').toUpperCase();
  const userAgent = String(req.headers['user-agent'] || '').trim();

  res.on('finish', () => {
    const userId = extractUserId(req, res);
    if (!userId) {
      return;
    }

    void logLoginIp({
      userId,
      ipAddress,
      userAgent,
      endpoint,
      method,
      statusCode: res.statusCode
    });
  });

  return next();
};

export default ipLogger;
