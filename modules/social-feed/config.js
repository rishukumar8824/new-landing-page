function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBool(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function readSocialFeedConfig() {
  const mysqlHost = String(process.env.SOCIAL_MYSQL_HOST || '').trim();
  const mysqlUser = String(process.env.SOCIAL_MYSQL_USER || '').trim();
  const mysqlPassword = String(process.env.SOCIAL_MYSQL_PASSWORD || '').trim();
  const mysqlDatabase = String(process.env.SOCIAL_MYSQL_DATABASE || '').trim();

  return {
    mysql: {
      enabled: Boolean(mysqlHost && mysqlUser && mysqlDatabase),
      host: mysqlHost,
      port: toInt(process.env.SOCIAL_MYSQL_PORT, 3306),
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
      connectionLimit: toInt(process.env.SOCIAL_MYSQL_POOL_SIZE, 10),
      ssl: normalizeBool(process.env.SOCIAL_MYSQL_SSL)
        ? {
            rejectUnauthorized: normalizeBool(process.env.SOCIAL_MYSQL_SSL_STRICT)
          }
        : undefined
    },
    app: {
      defaultPageSize: Math.max(5, Math.min(30, toInt(process.env.SOCIAL_FEED_PAGE_SIZE, 10))),
      maxPageSize: Math.max(10, Math.min(80, toInt(process.env.SOCIAL_FEED_MAX_PAGE_SIZE, 25)))
    }
  };
}

module.exports = {
  readSocialFeedConfig
};
