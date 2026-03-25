function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBool(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function readUserCenterConfig() {
  const mysqlHost = String(process.env.USER_CENTER_MYSQL_HOST || '').trim();
  const mysqlUser = String(process.env.USER_CENTER_MYSQL_USER || '').trim();
  const mysqlPassword = String(process.env.USER_CENTER_MYSQL_PASSWORD || '').trim();
  const mysqlDatabase = String(process.env.USER_CENTER_MYSQL_DATABASE || '').trim();

  return {
    mysql: {
      enabled: Boolean(mysqlHost && mysqlUser && mysqlDatabase),
      host: mysqlHost,
      port: toInt(process.env.USER_CENTER_MYSQL_PORT, 3306),
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
      connectionLimit: toInt(process.env.USER_CENTER_MYSQL_POOL_SIZE, 10),
      ssl: normalizeBool(process.env.USER_CENTER_MYSQL_SSL)
        ? {
            rejectUnauthorized: normalizeBool(process.env.USER_CENTER_MYSQL_SSL_STRICT)
          }
        : undefined
    },
    app: {
      defaultVipLevel: String(process.env.USER_CENTER_DEFAULT_VIP_LEVEL || 'Non-VIP').trim(),
      accountRecoveryDays: Math.max(1, toInt(process.env.USER_CENTER_RECOVERY_DAYS, 50))
    }
  };
}

module.exports = {
  readUserCenterConfig
};
