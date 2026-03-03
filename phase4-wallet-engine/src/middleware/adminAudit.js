import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const getRequestIp = (req) => {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const forwardedIp = forwardedRaw.split(',')[0].trim();
  return forwardedIp || String(req.ip || req.connection?.remoteAddress || '').trim() || 'unknown';
};

const isMissingTableError = (error) => {
  const code = String(error?.original?.code || error?.code || '').trim();
  return code === 'ER_NO_SUCH_TABLE';
};

export const logAdminAction = async (adminId, action, meta = {}) => {
  const normalizedAdminId = Number.parseInt(String(adminId || ''), 10);
  if (!Number.isInteger(normalizedAdminId) || normalizedAdminId <= 0) {
    return false;
  }

  const normalizedAction = String(action || '').trim();
  if (!normalizedAction) {
    return false;
  }

  try {
    await sequelize.query(
      `INSERT INTO admin_audit_logs
        (admin_id, action, meta, created_at)
       VALUES
        (:adminId, :action, :meta, NOW())`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          adminId: normalizedAdminId,
          action: normalizedAction.slice(0, 128),
          meta: JSON.stringify(meta || {})
        }
      }
    );

    return true;
  } catch (error) {
    if (isMissingTableError(error)) {
      return false;
    }

    console.error('[admin-audit] failed to write audit log', {
      adminId: normalizedAdminId,
      action: normalizedAction,
      message: error.message
    });
    return false;
  }
};

export const adminAudit = (actionResolver) => {
  return (req, res, next) => {
    const action =
      typeof actionResolver === 'function'
        ? String(actionResolver(req) || '').trim()
        : String(actionResolver || '').trim();

    if (!action) {
      return next();
    }

    const requestIp = getRequestIp(req);
    const userAgent = String(req.headers['user-agent'] || '').trim();

    res.on('finish', () => {
      if (res.statusCode >= 500) {
        return;
      }

      const adminId = req?.user?.id || req?.admin?.id || res?.locals?.admin_id;
      if (!adminId) {
        return;
      }

      void logAdminAction(adminId, action, {
        ip: requestIp,
        method: req.method,
        endpoint: req.originalUrl || req.path,
        status_code: res.statusCode,
        user_agent: userAgent
      });
    });

    return next();
  };
};

export default {
  logAdminAction,
  adminAudit
};
