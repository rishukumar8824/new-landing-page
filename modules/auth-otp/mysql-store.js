const mysql = require('mysql2/promise');

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function toMySqlDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function createMySqlAuthStore(config, { logger = console } = {}) {
  const mysqlConfig = config && typeof config === 'object' ? config : {};
  const enabled = Boolean(mysqlConfig.enabled);
  let pool = null;

  async function initialize() {
    if (!enabled) {
      return false;
    }
    if (pool) {
      return true;
    }

    pool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: mysqlConfig.connectionLimit || 10,
      ssl: mysqlConfig.ssl
    });

    await pool.query('SELECT 1');
    await ensureTables();
    logger.log('[auth-otp] MySQL store initialized');
    return true;
  }

  async function ensureTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_email_otps_email_created (email, created_at),
        KEY idx_email_otps_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NULL,
        kyc_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_users_email_auth (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Keep compatibility if the table already existed from earlier deployments.
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL');
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(32) NOT NULL DEFAULT 'pending'");
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    try {
      await pool.query('ALTER TABLE users ADD UNIQUE KEY ux_users_email_auth (email)');
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate')) {
        throw error;
      }
    }
  }

  function assertReady() {
    if (!enabled || !pool) {
      const error = new Error('Auth OTP MySQL store is not configured');
      error.statusCode = 503;
      error.code = 'AUTH_OTP_STORE_DISABLED';
      throw error;
    }
  }

  async function countOtpRequestsInLastHour(email) {
    assertReady();
    const normalizedEmail = normalizeEmail(email);
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM email_otps
       WHERE email = ?
         AND created_at >= (UTC_TIMESTAMP() - INTERVAL 1 HOUR)`,
      [normalizedEmail]
    );
    return Number(rows?.[0]?.count || 0);
  }

  async function createOtpRecord(email, otpHash, expiresAt) {
    assertReady();
    const normalizedEmail = normalizeEmail(email);
    await pool.execute('DELETE FROM email_otps WHERE email = ?', [normalizedEmail]);
    const [result] = await pool.execute(
      `INSERT INTO email_otps (email, otp_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, 0, UTC_TIMESTAMP())`,
      [normalizedEmail, String(otpHash || '').trim(), toMySqlDateTime(expiresAt)]
    );
    return Number(result.insertId || 0);
  }

  async function getLatestOtpRecord(email) {
    assertReady();
    const normalizedEmail = normalizeEmail(email);
    const [rows] = await pool.execute(
      `SELECT id, email, otp_hash, expires_at, attempts, created_at
       FROM email_otps
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail]
    );
    const row = rows?.[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      email: normalizeEmail(row.email),
      otpHash: String(row.otp_hash || '').trim(),
      expiresAt: new Date(row.expires_at),
      attempts: Number(row.attempts || 0),
      createdAt: new Date(row.created_at)
    };
  }

  async function incrementOtpAttempts(otpId) {
    assertReady();
    await pool.execute('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [Number(otpId)]);
    const [rows] = await pool.execute('SELECT attempts FROM email_otps WHERE id = ?', [Number(otpId)]);
    return Number(rows?.[0]?.attempts || 0);
  }

  async function deleteOtpRecordById(otpId) {
    assertReady();
    await pool.execute('DELETE FROM email_otps WHERE id = ?', [Number(otpId)]);
  }

  async function findUserByEmail(email) {
    assertReady();
    const normalizedEmail = normalizeEmail(email);
    const [rows] = await pool.execute(
      `SELECT id, email, password, kyc_status, created_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );
    const row = rows?.[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      email: normalizeEmail(row.email),
      password: row.password,
      kycStatus: String(row.kyc_status || 'pending').trim().toLowerCase(),
      createdAt: new Date(row.created_at)
    };
  }

  async function createUser(email) {
    assertReady();
    const normalizedEmail = normalizeEmail(email);
    const [result] = await pool.execute(
      `INSERT INTO users (email, password, kyc_status, created_at)
       VALUES (?, NULL, 'pending', UTC_TIMESTAMP())`,
      [normalizedEmail]
    );
    const created = await findUserByEmail(normalizedEmail);
    if (created) {
      return created;
    }
    return {
      id: Number(result.insertId || 0),
      email: normalizedEmail,
      password: null,
      kycStatus: 'pending',
      createdAt: new Date()
    };
  }

  async function close() {
    if (!pool) {
      return;
    }
    await pool.end();
    pool = null;
  }

  return {
    initialize,
    close,
    enabled,
    countOtpRequestsInLastHour,
    createOtpRecord,
    getLatestOtpRecord,
    incrementOtpAttempts,
    deleteOtpRecordById,
    findUserByEmail,
    createUser
  };
}

module.exports = {
  createMySqlAuthStore,
  normalizeEmail
};
