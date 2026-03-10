function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function readAuthOtpConfig() {
  const mysqlHost = String(process.env.AUTH_MYSQL_HOST || process.env.MYSQL_HOST || process.env.DB_HOST || '').trim();
  const mysqlUser = String(process.env.AUTH_MYSQL_USER || process.env.MYSQL_USER || process.env.DB_USER || '').trim();
  const mysqlPassword = String(process.env.AUTH_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '').trim();
  const mysqlDatabase = String(process.env.AUTH_MYSQL_DATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || '').trim();

  const mysqlConfig = {
    host: mysqlHost,
    port: toInt(process.env.AUTH_MYSQL_PORT || process.env.MYSQL_PORT || process.env.DB_PORT, 3306),
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    connectionLimit: toInt(process.env.AUTH_MYSQL_POOL_SIZE, 10),
    ssl: normalizeBool(process.env.AUTH_MYSQL_SSL)
      ? {
          rejectUnauthorized: normalizeBool(process.env.AUTH_MYSQL_SSL_STRICT)
        }
      : undefined
  };

  return {
    mysql: {
      enabled: Boolean(mysqlHost && mysqlUser && mysqlDatabase),
      ...mysqlConfig
    },
    geetest: {
      captchaId: String(process.env.GEETEST_CAPTCHA_ID || process.env.GEETEST_ID || '').trim(),
      captchaKey: String(process.env.GEETEST_CAPTCHA_KEY || process.env.GEETEST_KEY || '').trim(),
      validateEndpoint: String(process.env.GEETEST_VALIDATE_URL || 'https://gcaptcha4.geetest.com/validate').trim(),
      timeoutMs: Math.max(2000, toInt(process.env.GEETEST_TIMEOUT_MS, 10000))
    },
    smtp: {
      host: String(process.env.SMTP_HOST || '').trim(),
      port: Math.max(1, toInt(process.env.SMTP_PORT, 587)),
      secure: normalizeBool(process.env.SMTP_SECURE),
      user: String(process.env.SMTP_USER || '').trim(),
      pass: String(process.env.SMTP_PASS || '').trim(),
      from: String(process.env.SMTP_FROM_EMAIL || process.env.MAIL_FROM || process.env.RESEND_FROM_EMAIL || '').trim()
    },
    otp: {
      ttlMs: 5 * 60 * 1000,
      maxAttempts: 3,
      maxRequestsPerHour: 5
    },
    cookieNames: {
      accessToken: String(process.env.AUTH_ACCESS_COOKIE_NAME || 'bitegit_auth_access').trim(),
      refreshToken: String(process.env.AUTH_REFRESH_COOKIE_NAME || 'bitegit_auth_refresh').trim()
    }
  };
}

module.exports = {
  readAuthOtpConfig
};
