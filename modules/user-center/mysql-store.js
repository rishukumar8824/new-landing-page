const crypto = require('crypto');
const mysql = require('mysql2/promise');

const SUPPORTED_COINS = ['BTC', 'USDT', 'ETH', 'LTC', 'BCH', 'TRX', 'DOGE', 'XRP', 'SOL', 'BNB'];
const SUPPORTED_NETWORKS_BY_COIN = {
  BTC: ['BTC'],
  USDT: ['TRC20', 'ERC20', 'BEP20'],
  ETH: ['ERC20'],
  LTC: ['LTC'],
  BCH: ['BCH'],
  TRX: ['TRC20'],
  DOGE: ['DOGE'],
  XRP: ['XRP'],
  SOL: ['SOL'],
  BNB: ['BEP20']
};

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function normalizeCoin(raw) {
  const normalized = String(raw || '').trim().toUpperCase();
  return SUPPORTED_COINS.includes(normalized) ? normalized : 'USDT';
}

function normalizeNetwork(raw, coin) {
  const normalizedCoin = normalizeCoin(coin);
  const normalizedNetwork = String(raw || '').trim().toUpperCase();
  const allowed = SUPPORTED_NETWORKS_BY_COIN[normalizedCoin] || [normalizedCoin];
  return allowed.includes(normalizedNetwork) ? normalizedNetwork : allowed[0];
}

function normalizeKycStatus(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  if (['unverified', 'pending', 'verified'].includes(normalized)) {
    return normalized;
  }
  return 'unverified';
}

function toDateTimeSql(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function randomUid() {
  return String(crypto.randomInt(100000000, 999999999));
}

function parseJson(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    return fallback;
  }
}

async function withTx(pool, handler) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // Ignore rollback failures and surface original error.
    }
    throw error;
  } finally {
    connection.release();
  }
}

function createUserCenterStore(config, { logger = console } = {}) {
  const mysqlConfig = config && typeof config === 'object' ? config : {};
  const enabled = Boolean(mysqlConfig.enabled);
  let pool = null;

  function assertReady() {
    if (!enabled || !pool) {
      const error = new Error('User Center MySQL store is not configured');
      error.statusCode = 503;
      error.code = 'USER_CENTER_STORE_DISABLED';
      throw error;
    }
  }

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
    await seedStaticData();
    logger.log('[user-center] MySQL store initialized');
    return true;
  }

  async function ensureTables() {
    assertReady();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        external_user_id VARCHAR(64) NULL,
        email VARCHAR(255) NOT NULL,
        nickname VARCHAR(80) NOT NULL DEFAULT 'Bitegit User',
        avatar TEXT NULL,
        uid VARCHAR(32) NULL,
        vip_level VARCHAR(32) NOT NULL DEFAULT 'Non-VIP',
        kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
        country VARCHAR(64) NULL,
        full_name VARCHAR(120) NULL,
        id_number_masked VARCHAR(64) NULL,
        password VARCHAR(255) NULL,
        phone VARCHAR(32) NULL,
        fund_code_hash VARCHAR(255) NULL,
        twofa_secret VARCHAR(255) NULL,
        twofa_enabled TINYINT(1) NOT NULL DEFAULT 0,
        account_status VARCHAR(32) NOT NULL DEFAULT 'active',
        deleted_at DATETIME NULL,
        recovery_until DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_user_center_users_email (email),
        UNIQUE KEY ux_user_center_users_uid (uid),
        UNIQUE KEY ux_user_center_users_external (external_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        ip VARCHAR(64) NOT NULL,
        device VARCHAR(255) NOT NULL,
        login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_login_history_user_time (user_id, login_time),
        CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdraw_addresses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        coin VARCHAR(16) NOT NULL,
        network VARCHAR(16) NOT NULL,
        address VARCHAR(255) NOT NULL,
        label VARCHAR(120) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_withdraw_addresses_user_created (user_id, created_at),
        CONSTRAINT fk_withdraw_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        language VARCHAR(24) NOT NULL DEFAULT 'en',
        currency VARCHAR(16) NOT NULL DEFAULT 'USD',
        theme VARCHAR(16) NOT NULL DEFAULT 'dark',
        trend_colors VARCHAR(16) NOT NULL DEFAULT 'green-up',
        notifications TEXT NULL,
        push_notifications TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_user_preferences_user (user_id),
        CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fee_configs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        fee_type VARCHAR(24) NOT NULL,
        tier_label VARCHAR(64) NOT NULL,
        maker_fee VARCHAR(32) NOT NULL,
        taker_fee VARCHAR(32) NOT NULL,
        withdrawal_fee VARCHAR(32) NOT NULL,
        min_withdrawal VARCHAR(32) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_fee_configs_type_tier (fee_type, tier_label)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_gifts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        creator_id BIGINT UNSIGNED NOT NULL,
        asset VARCHAR(16) NOT NULL,
        amount DECIMAL(24,8) NOT NULL,
        gift_code VARCHAR(64) NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        claimed_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        claimed_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY ux_crypto_gifts_code (gift_code),
        KEY idx_crypto_gifts_creator (creator_id),
        CONSTRAINT fk_crypto_gifts_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_claims (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        gift_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_gift_claim_once (gift_id, user_id),
        KEY idx_gift_claims_user (user_id),
        CONSTRAINT fk_gift_claims_gift FOREIGN KEY (gift_id) REFERENCES crypto_gifts(id) ON DELETE CASCADE,
        CONSTRAINT fk_gift_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        referrer_id BIGINT UNSIGNED NOT NULL,
        referred_user VARCHAR(255) NOT NULL,
        reward_amount DECIMAL(24,8) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_referrals_referrer (referrer_id),
        CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        subject VARCHAR(180) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'general',
        status VARCHAR(24) NOT NULL DEFAULT 'open',
        priority VARCHAR(24) NOT NULL DEFAULT 'normal',
        escalated_to_human TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_support_tickets_user (user_id),
        CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        ticket_id BIGINT UNSIGNED NOT NULL,
        sender_type VARCHAR(24) NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_support_messages_ticket (ticket_id, created_at),
        CONSTRAINT fk_support_messages_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS help_articles (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        topic VARCHAR(120) NOT NULL,
        title VARCHAR(180) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_help_articles_topic (topic)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(180) NOT NULL,
        body TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    async function safeAddUserColumn(sql) {
      try {
        await pool.query(sql);
      } catch (error) {
        const msg = String(error?.message || '').toLowerCase();
        const duplicateColumn = msg.includes('duplicate column');
        const unknownIfNotExistsSyntax = msg.includes('if not exists');
        if (!duplicateColumn && !unknownIfNotExistsSyntax) {
          throw error;
        }
      }
    }

    await safeAddUserColumn('ALTER TABLE users ADD COLUMN external_user_id VARCHAR(64) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN nickname VARCHAR(80) NOT NULL DEFAULT \'Bitegit User\'');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN avatar TEXT NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN uid VARCHAR(32) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN vip_level VARCHAR(32) NOT NULL DEFAULT \'Non-VIP\'');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN country VARCHAR(64) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN id_number_masked VARCHAR(64) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN phone VARCHAR(32) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN fund_code_hash VARCHAR(255) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN twofa_secret VARCHAR(255) NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN twofa_enabled TINYINT(1) NOT NULL DEFAULT 0');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN account_status VARCHAR(32) NOT NULL DEFAULT \'active\'');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN recovery_until DATETIME NULL');
    await safeAddUserColumn('ALTER TABLE users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }

  async function seedStaticData() {
    assertReady();

    const feeRows = [
      ['VIP', 'VIP 0', '0.1000%', '0.1000%', '0.0005 BTC', '0.001 BTC', 1],
      ['VIP', 'VIP 1', '0.0900%', '0.1000%', '0.0004 BTC', '0.001 BTC', 2],
      ['SPOT', 'Standard', '0.1000%', '0.1000%', '0.8 USDT', '10 USDT', 1],
      ['FUTURES', 'USDT-M', '0.0200%', '0.0400%', '0.0', '0.0', 1],
      ['WITHDRAWAL', 'USDT-TRC20', '0.0', '0.0', '1 USDT', '10 USDT', 1],
      ['WITHDRAWAL', 'BTC', '0.0', '0.0', '0.0005 BTC', '0.001 BTC', 2]
    ];

    for (const row of feeRows) {
      await pool.execute(
        `INSERT INTO fee_configs (fee_type, tier_label, maker_fee, taker_fee, withdrawal_fee, min_withdrawal, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           maker_fee = VALUES(maker_fee),
           taker_fee = VALUES(taker_fee),
           withdrawal_fee = VALUES(withdrawal_fee),
           min_withdrawal = VALUES(min_withdrawal),
           sort_order = VALUES(sort_order),
           updated_at = CURRENT_TIMESTAMP`,
        row
      );
    }

    const announcementRows = [
      ['Security Reminder', 'Enable 2FA and fund code to strengthen account security.'],
      ['Support Update', 'Live chat escalations are currently available 24/7 for priority tickets.']
    ];
    for (const row of announcementRows) {
      const [existing] = await pool.execute('SELECT id FROM announcements WHERE title = ? LIMIT 1', [row[0]]);
      if (!existing[0]) {
        await pool.execute('INSERT INTO announcements (title, body) VALUES (?, ?)', row);
      }
    }

    const helpRows = [
      ['Deposit issues', 'Deposit not credited', 'Check tx hash confirmations and matching network details.'],
      ['Withdrawal issues', 'Withdrawal pending', 'Pending withdrawals may be delayed by risk control checks.'],
      ['KYC verification', 'KYC status review', 'Ensure your profile name and ID document details match exactly.'],
      ['Account restrictions', 'Account locked or limited', 'Contact support with UID and latest login details for review.'],
      ['Security problems', '2FA and login security', 'Reset security methods only through verified identity recovery flow.']
    ];

    for (const row of helpRows) {
      const [existing] = await pool.execute('SELECT id FROM help_articles WHERE topic = ? AND title = ? LIMIT 1', [row[0], row[1]]);
      if (!existing[0]) {
        await pool.execute('INSERT INTO help_articles (topic, title, content) VALUES (?, ?, ?)', row);
      }
    }
  }

  async function resolveUserRow({ externalUserId, email }) {
    assertReady();

    const normalizedExternal = String(externalUserId || '').trim();
    const normalizedEmail = normalizeEmail(email);

    if (normalizedExternal) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE external_user_id = ? LIMIT 1', [normalizedExternal]);
      if (rows[0]) {
        return rows[0];
      }
    }

    if (normalizedEmail) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (rows[0]) {
        return rows[0];
      }
    }

    return null;
  }

  async function ensureUniqueUid(connection) {
    for (let i = 0; i < 10; i += 1) {
      const candidate = randomUid();
      const [rows] = await connection.execute('SELECT id FROM users WHERE uid = ? LIMIT 1', [candidate]);
      if (!rows[0]) {
        return candidate;
      }
    }
    throw new Error('Unable to generate unique UID');
  }

  function shapeUser(row) {
    if (!row) {
      return null;
    }
    return {
      id: Number(row.id),
      externalUserId: String(row.external_user_id || '').trim(),
      email: normalizeEmail(row.email),
      nickname: String(row.nickname || 'Bitegit User').trim(),
      avatar: row.avatar ? String(row.avatar).trim() : '',
      uid: String(row.uid || '').trim(),
      vipLevel: String(row.vip_level || 'Non-VIP').trim(),
      kycStatus: normalizeKycStatus(row.kyc_status || 'unverified'),
      country: String(row.country || '').trim(),
      fullName: String(row.full_name || '').trim(),
      idNumberMasked: String(row.id_number_masked || '').trim(),
      phone: String(row.phone || '').trim(),
      twofaEnabled: Number(row.twofa_enabled || 0) === 1,
      accountStatus: String(row.account_status || 'active').trim().toLowerCase(),
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      recoveryUntil: row.recovery_until ? new Date(row.recovery_until).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    };
  }

  async function upsertUserFromAuth({ externalUserId, email, kycStatus, vipLevel }) {
    assertReady();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      error.code = 'EMAIL_REQUIRED';
      throw error;
    }

    return withTx(pool, async (connection) => {
      let row = await resolveUserRow({ externalUserId, email: normalizedEmail });

      if (!row) {
        const uid = await ensureUniqueUid(connection);
        const nickname = normalizedEmail.split('@')[0] || 'Bitegit User';
        await connection.execute(
          `INSERT INTO users (
            external_user_id, email, nickname, uid, vip_level, kyc_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [
            String(externalUserId || '').trim() || null,
            normalizedEmail,
            nickname,
            uid,
            String(vipLevel || 'Non-VIP').trim() || 'Non-VIP',
            normalizeKycStatus(kycStatus || 'unverified')
          ]
        );
        row = await resolveUserRow({ externalUserId, email: normalizedEmail });
      } else {
        const updates = [];
        const params = [];

        if (!row.external_user_id && String(externalUserId || '').trim()) {
          updates.push('external_user_id = ?');
          params.push(String(externalUserId).trim());
        }

        const normalizedIncomingKyc = normalizeKycStatus(kycStatus || row.kyc_status);
        if (normalizedIncomingKyc && normalizedIncomingKyc !== normalizeKycStatus(row.kyc_status)) {
          updates.push('kyc_status = ?');
          params.push(normalizedIncomingKyc);
        }

        if (vipLevel && String(vipLevel).trim() !== String(row.vip_level || '')) {
          updates.push('vip_level = ?');
          params.push(String(vipLevel).trim());
        }

        if (!row.uid) {
          const uid = await ensureUniqueUid(connection);
          updates.push('uid = ?');
          params.push(uid);
        }

        if (updates.length > 0) {
          updates.push('updated_at = UTC_TIMESTAMP()');
          params.push(Number(row.id));
          await connection.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
          row = await resolveUserRow({ externalUserId, email: normalizedEmail });
        }
      }

      const userId = Number(row.id);
      await connection.execute(
        `INSERT INTO user_preferences (user_id, language, currency, theme, trend_colors, notifications, push_notifications)
         VALUES (?, 'en', 'USD', 'dark', 'green-up', ?, 1)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [userId, JSON.stringify({ email: true, security: true, marketing: false })]
      );

      return shapeUser(row);
    });
  }

  async function getUserByIdentity(identity) {
    assertReady();
    const row = await resolveUserRow(identity || {});
    return shapeUser(row);
  }

  async function updateProfile(userId, { nickname, avatar }) {
    assertReady();
    const updates = [];
    const params = [];

    if (nickname !== undefined) {
      const normalizedNickname = String(nickname || '').trim().slice(0, 80);
      if (normalizedNickname.length < 2) {
        const error = new Error('Nickname must be at least 2 characters.');
        error.statusCode = 400;
        error.code = 'NICKNAME_INVALID';
        throw error;
      }
      updates.push('nickname = ?');
      params.push(normalizedNickname);
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(String(avatar || '').trim() || null);
    }

    if (updates.length === 0) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
      return shapeUser(rows[0]);
    }

    updates.push('updated_at = UTC_TIMESTAMP()');
    params.push(Number(userId));

    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    return shapeUser(rows[0]);
  }

  async function updateIdentityInfo(userId, { country, fullName, idNumberMasked, kycStatus }) {
    assertReady();
    await pool.execute(
      `UPDATE users
       SET country = ?,
           full_name = ?,
           id_number_masked = ?,
           kyc_status = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        String(country || '').trim() || null,
        String(fullName || '').trim() || null,
        String(idNumberMasked || '').trim() || null,
        normalizeKycStatus(kycStatus || 'pending'),
        Number(userId)
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    return shapeUser(rows[0]);
  }

  async function changePassword(userId, passwordHash) {
    assertReady();
    await pool.execute('UPDATE users SET password = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [passwordHash, Number(userId)]);
  }

  async function getPasswordHash(userId) {
    assertReady();
    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    return rows?.[0]?.password ? String(rows[0].password) : '';
  }

  async function changePhone(userId, phone) {
    assertReady();
    await pool.execute('UPDATE users SET phone = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [String(phone || '').trim(), Number(userId)]);
  }

  async function changeEmail(userId, email) {
    assertReady();
    const normalized = normalizeEmail(email);
    await pool.execute('UPDATE users SET email = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [normalized, Number(userId)]);
  }

  async function setFundCodeHash(userId, fundCodeHash) {
    assertReady();
    await pool.execute('UPDATE users SET fund_code_hash = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [fundCodeHash, Number(userId)]);
  }

  async function setTwoFactor(userId, { secret, enabled }) {
    assertReady();
    await pool.execute(
      'UPDATE users SET twofa_secret = ?, twofa_enabled = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [String(secret || '').trim() || null, enabled ? 1 : 0, Number(userId)]
    );
  }

  async function getTwoFactorSecret(userId) {
    assertReady();
    const [rows] = await pool.execute('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    return {
      secret: rows?.[0]?.twofa_secret ? String(rows[0].twofa_secret) : '',
      enabled: Number(rows?.[0]?.twofa_enabled || 0) === 1
    };
  }

  async function addLoginHistory(userId, { ip, device }) {
    assertReady();
    await pool.execute(
      'INSERT INTO login_history (user_id, ip, device, login_time) VALUES (?, ?, ?, UTC_TIMESTAMP())',
      [Number(userId), String(ip || 'unknown').trim(), String(device || 'unknown').trim()]
    );
  }

  async function listLoginHistory(userId, limit = 30) {
    assertReady();
    const [rows] = await pool.execute(
      `SELECT id, ip, device, login_time
       FROM login_history
       WHERE user_id = ?
       ORDER BY login_time DESC
       LIMIT ?`,
      [Number(userId), Math.max(1, Math.min(100, Number(limit) || 30))]
    );

    return rows.map((row) => ({
      id: Number(row.id),
      ip: String(row.ip || ''),
      device: String(row.device || ''),
      loginTime: row.login_time ? new Date(row.login_time).toISOString() : null
    }));
  }

  async function addWithdrawAddress(userId, payload) {
    assertReady();
    const coin = normalizeCoin(payload.coin);
    const network = normalizeNetwork(payload.network, coin);
    const address = String(payload.address || '').trim();
    const label = String(payload.label || '').trim().slice(0, 120);

    if (address.length < 8) {
      const error = new Error('Invalid withdrawal address.');
      error.statusCode = 400;
      error.code = 'ADDRESS_INVALID';
      throw error;
    }

    const [result] = await pool.execute(
      `INSERT INTO withdraw_addresses (user_id, coin, network, address, label, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [Number(userId), coin, network, address, label || `${coin} address`]
    );

    const [rows] = await pool.execute('SELECT * FROM withdraw_addresses WHERE id = ? LIMIT 1', [Number(result.insertId)]);
    return rows[0];
  }

  async function listWithdrawAddresses(userId) {
    assertReady();
    const [rows] = await pool.execute(
      `SELECT id, coin, network, address, label, created_at
       FROM withdraw_addresses
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [Number(userId)]
    );

    return rows.map((row) => ({
      id: Number(row.id),
      coin: String(row.coin || '').toUpperCase(),
      network: String(row.network || '').toUpperCase(),
      address: String(row.address || ''),
      label: String(row.label || ''),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  }

  async function deleteWithdrawAddress(userId, addressId) {
    assertReady();
    const [result] = await pool.execute('DELETE FROM withdraw_addresses WHERE user_id = ? AND id = ?', [Number(userId), Number(addressId)]);
    return Number(result.affectedRows || 0) > 0;
  }

  async function getPreferences(userId) {
    assertReady();
    const [rows] = await pool.execute('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [Number(userId)]);
    const row = rows[0];
    if (!row) {
      await pool.execute(
        `INSERT INTO user_preferences (user_id, language, currency, theme, trend_colors, notifications, push_notifications)
         VALUES (?, 'en', 'USD', 'dark', 'green-up', ?, 1)`,
        [Number(userId), JSON.stringify({ email: true, security: true, marketing: false })]
      );
      return getPreferences(userId);
    }

    return {
      language: String(row.language || 'en').toLowerCase(),
      currency: String(row.currency || 'USD').toUpperCase(),
      theme: String(row.theme || 'dark').toLowerCase(),
      trendColors: String(row.trend_colors || 'green-up').toLowerCase(),
      notifications: parseJson(row.notifications, { email: true, security: true, marketing: false }),
      pushNotifications: Number(row.push_notifications || 0) === 1
    };
  }

  async function updatePreferences(userId, patch = {}) {
    assertReady();
    const current = await getPreferences(userId);
    const next = {
      language: String(patch.language || current.language).trim().toLowerCase() || 'en',
      currency: String(patch.currency || current.currency).trim().toUpperCase() || 'USD',
      theme: ['dark', 'light'].includes(String(patch.theme || '').trim().toLowerCase())
        ? String(patch.theme).trim().toLowerCase()
        : current.theme,
      trendColors: ['green-up', 'red-up'].includes(String(patch.trendColors || '').trim().toLowerCase())
        ? String(patch.trendColors).trim().toLowerCase()
        : current.trendColors,
      notifications:
        patch.notifications && typeof patch.notifications === 'object'
          ? patch.notifications
          : current.notifications,
      pushNotifications:
        patch.pushNotifications === undefined
          ? current.pushNotifications
          : Boolean(patch.pushNotifications)
    };

    await pool.execute(
      `UPDATE user_preferences
       SET language = ?, currency = ?, theme = ?, trend_colors = ?, notifications = ?, push_notifications = ?, updated_at = UTC_TIMESTAMP()
       WHERE user_id = ?`,
      [
        next.language,
        next.currency,
        next.theme,
        next.trendColors,
        JSON.stringify(next.notifications || {}),
        next.pushNotifications ? 1 : 0,
        Number(userId)
      ]
    );

    return next;
  }

  async function listFees() {
    assertReady();
    const [rows] = await pool.execute(
      `SELECT fee_type, tier_label, maker_fee, taker_fee, withdrawal_fee, min_withdrawal
       FROM fee_configs
       ORDER BY fee_type ASC, sort_order ASC, tier_label ASC`
    );

    const grouped = {
      VIP: [],
      FUTURES: [],
      SPOT: [],
      WITHDRAWAL: []
    };

    for (const row of rows) {
      const type = String(row.fee_type || '').trim().toUpperCase();
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push({
        tierLabel: String(row.tier_label || ''),
        makerFee: String(row.maker_fee || ''),
        takerFee: String(row.taker_fee || ''),
        withdrawalFee: String(row.withdrawal_fee || ''),
        minWithdrawal: String(row.min_withdrawal || '')
      });
    }

    return grouped;
  }

  function createGiftCode() {
    return `BGIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async function createGift(userId, { asset, amount }) {
    assertReady();
    const normalizedAsset = normalizeCoin(asset || 'USDT');
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      const error = new Error('Gift amount must be greater than zero.');
      error.statusCode = 400;
      error.code = 'GIFT_AMOUNT_INVALID';
      throw error;
    }

    let giftCode = createGiftCode();
    for (let i = 0; i < 5; i += 1) {
      const [existing] = await pool.execute('SELECT id FROM crypto_gifts WHERE gift_code = ? LIMIT 1', [giftCode]);
      if (!existing[0]) {
        break;
      }
      giftCode = createGiftCode();
    }

    const [result] = await pool.execute(
      `INSERT INTO crypto_gifts (creator_id, asset, amount, gift_code, status, created_at)
       VALUES (?, ?, ?, ?, 'active', UTC_TIMESTAMP())`,
      [Number(userId), normalizedAsset, amountValue, giftCode]
    );

    return {
      id: Number(result.insertId),
      asset: normalizedAsset,
      amount: amountValue,
      giftCode,
      status: 'active'
    };
  }

  async function claimGift(userId, giftCode) {
    assertReady();
    const normalizedCode = String(giftCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      const error = new Error('Gift code is required.');
      error.statusCode = 400;
      error.code = 'GIFT_CODE_REQUIRED';
      throw error;
    }

    return withTx(pool, async (connection) => {
      const [rows] = await connection.execute('SELECT * FROM crypto_gifts WHERE gift_code = ? LIMIT 1', [normalizedCode]);
      const gift = rows[0];
      if (!gift) {
        const error = new Error('Gift code is invalid.');
        error.statusCode = 404;
        error.code = 'GIFT_NOT_FOUND';
        throw error;
      }

      if (String(gift.status || '').toLowerCase() !== 'active') {
        const error = new Error('Gift code has already been claimed.');
        error.statusCode = 409;
        error.code = 'GIFT_ALREADY_CLAIMED';
        throw error;
      }

      await connection.execute(
        'INSERT INTO gift_claims (gift_id, user_id, claimed_at) VALUES (?, ?, UTC_TIMESTAMP())',
        [Number(gift.id), Number(userId)]
      );

      await connection.execute(
        `UPDATE crypto_gifts
         SET status = 'claimed', claimed_by = ?, claimed_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [Number(userId), Number(gift.id)]
      );

      return {
        id: Number(gift.id),
        asset: String(gift.asset || ''),
        amount: Number(gift.amount || 0),
        giftCode: normalizedCode,
        status: 'claimed'
      };
    });
  }

  async function listGifts(userId) {
    assertReady();
    const [createdRows] = await pool.execute(
      `SELECT id, asset, amount, gift_code, status, created_at, claimed_at
       FROM crypto_gifts
       WHERE creator_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [Number(userId)]
    );

    const [claimRows] = await pool.execute(
      `SELECT gc.id, gc.gift_id, gc.claimed_at, cg.asset, cg.amount, cg.gift_code
       FROM gift_claims gc
       INNER JOIN crypto_gifts cg ON cg.id = gc.gift_id
       WHERE gc.user_id = ?
       ORDER BY gc.claimed_at DESC
       LIMIT 100`,
      [Number(userId)]
    );

    return {
      created: createdRows.map((row) => ({
        id: Number(row.id),
        asset: String(row.asset || ''),
        amount: Number(row.amount || 0),
        giftCode: String(row.gift_code || ''),
        status: String(row.status || ''),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null
      })),
      claimed: claimRows.map((row) => ({
        claimId: Number(row.id),
        giftId: Number(row.gift_id),
        asset: String(row.asset || ''),
        amount: Number(row.amount || 0),
        giftCode: String(row.gift_code || ''),
        claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null
      }))
    };
  }

  function referralCodeForUid(uid) {
    const normalized = String(uid || '').replace(/\D/g, '');
    return `BG${normalized.slice(-6).padStart(6, '0')}`;
  }

  async function listReferrals(userId) {
    assertReady();
    const [userRows] = await pool.execute('SELECT uid FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    const uid = String(userRows?.[0]?.uid || '').trim();

    const [rows] = await pool.execute(
      `SELECT id, referred_user, reward_amount, created_at
       FROM referrals
       WHERE referrer_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [Number(userId)]
    );

    const totalRewards = rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0);

    return {
      referralCode: referralCodeForUid(uid),
      totalInvites: rows.length,
      totalRewards,
      invites: rows.map((row) => ({
        id: Number(row.id),
        referredUser: String(row.referred_user || ''),
        rewardAmount: Number(row.reward_amount || 0),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
      }))
    };
  }

  async function listAnnouncements() {
    assertReady();
    const [rows] = await pool.execute(
      'SELECT id, title, body, created_at FROM announcements ORDER BY created_at DESC LIMIT 100'
    );

    return rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title || ''),
      body: String(row.body || ''),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  }

  async function listHelpArticles({ topic, limit = 100 }) {
    assertReady();
    const normalizedTopic = String(topic || '').trim();

    let rows = null;
    if (normalizedTopic) {
      [rows] = await pool.execute(
        `SELECT id, topic, title, content, created_at
         FROM help_articles
         WHERE topic LIKE CONCAT('%', ?, '%') OR title LIKE CONCAT('%', ?, '%')
         ORDER BY created_at DESC
         LIMIT ?`,
        [normalizedTopic, normalizedTopic, Math.max(1, Math.min(500, Number(limit) || 100))]
      );
    } else {
      [rows] = await pool.execute(
        `SELECT id, topic, title, content, created_at
         FROM help_articles
         ORDER BY created_at DESC
         LIMIT ?`,
        [Math.max(1, Math.min(500, Number(limit) || 100))]
      );
    }

    return rows.map((row) => ({
      id: Number(row.id),
      topic: String(row.topic || ''),
      title: String(row.title || ''),
      content: String(row.content || ''),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  }

  async function createSupportTicket(userId, { subject, category, message, attachmentUrl }) {
    assertReady();

    return withTx(pool, async (connection) => {
      const [ticketResult] = await connection.execute(
        `INSERT INTO support_tickets (user_id, subject, category, status, priority, escalated_to_human, created_at, updated_at)
         VALUES (?, ?, ?, 'open', 'normal', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          Number(userId),
          String(subject || '').trim().slice(0, 180) || 'Support request',
          String(category || 'general').trim().slice(0, 80) || 'general'
        ]
      );

      const ticketId = Number(ticketResult.insertId);

      if (message && String(message).trim()) {
        await connection.execute(
          `INSERT INTO support_messages (ticket_id, sender_type, message, attachment_url, created_at)
           VALUES (?, 'user', ?, ?, UTC_TIMESTAMP())`,
          [ticketId, String(message).trim(), String(attachmentUrl || '').trim() || null]
        );
      }

      return ticketId;
    });
  }

  async function getSupportTicketById(userId, ticketId) {
    assertReady();
    const [rows] = await pool.execute(
      `SELECT id, user_id, subject, category, status, priority, escalated_to_human, created_at, updated_at
       FROM support_tickets
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [Number(ticketId), Number(userId)]
    );
    return rows[0] || null;
  }

  async function listSupportTickets(userId, limit = 100) {
    assertReady();
    const [rows] = await pool.execute(
      `SELECT id, subject, category, status, priority, escalated_to_human, created_at, updated_at
       FROM support_tickets
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [Number(userId), Math.max(1, Math.min(500, Number(limit) || 100))]
    );

    return rows.map((row) => ({
      id: Number(row.id),
      subject: String(row.subject || ''),
      category: String(row.category || ''),
      status: String(row.status || ''),
      priority: String(row.priority || ''),
      escalatedToHuman: Number(row.escalated_to_human || 0) === 1,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    }));
  }

  async function addSupportMessage(userId, ticketId, { senderType, message, attachmentUrl }) {
    assertReady();
    const ticket = await getSupportTicketById(userId, ticketId);
    if (!ticket) {
      const error = new Error('Support ticket not found.');
      error.statusCode = 404;
      error.code = 'SUPPORT_TICKET_NOT_FOUND';
      throw error;
    }

    if (String(ticket.status || '').toLowerCase() === 'closed') {
      const error = new Error('Support ticket is already closed.');
      error.statusCode = 409;
      error.code = 'SUPPORT_TICKET_CLOSED';
      throw error;
    }

    await pool.execute(
      `INSERT INTO support_messages (ticket_id, sender_type, message, attachment_url, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [Number(ticketId), String(senderType || 'user').trim(), String(message || '').trim(), String(attachmentUrl || '').trim() || null]
    );

    await pool.execute('UPDATE support_tickets SET updated_at = UTC_TIMESTAMP() WHERE id = ?', [Number(ticketId)]);
  }

  async function setSupportEscalation(ticketId, escalated) {
    assertReady();
    await pool.execute('UPDATE support_tickets SET escalated_to_human = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [escalated ? 1 : 0, Number(ticketId)]);
  }

  async function listSupportMessages(userId, ticketId, limit = 500) {
    assertReady();
    const ticket = await getSupportTicketById(userId, ticketId);
    if (!ticket) {
      const error = new Error('Support ticket not found.');
      error.statusCode = 404;
      error.code = 'SUPPORT_TICKET_NOT_FOUND';
      throw error;
    }

    const [rows] = await pool.execute(
      `SELECT id, sender_type, message, attachment_url, created_at
       FROM support_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [Number(ticketId), Math.max(1, Math.min(1000, Number(limit) || 500))]
    );

    return rows.map((row) => ({
      id: Number(row.id),
      senderType: String(row.sender_type || 'user'),
      message: String(row.message || ''),
      attachmentUrl: row.attachment_url ? String(row.attachment_url) : '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  }

  async function deleteAccount(userId, recoveryUntil) {
    assertReady();
    await pool.execute(
      `UPDATE users
       SET account_status = 'deleted',
           deleted_at = UTC_TIMESTAMP(),
           recovery_until = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [toDateTimeSql(recoveryUntil), Number(userId)]
    );
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
    normalizeEmail,
    normalizeCoin,
    normalizeNetwork,
    normalizeKycStatus,
    upsertUserFromAuth,
    getUserByIdentity,
    updateProfile,
    updateIdentityInfo,
    changePassword,
    getPasswordHash,
    changePhone,
    changeEmail,
    setFundCodeHash,
    setTwoFactor,
    getTwoFactorSecret,
    addLoginHistory,
    listLoginHistory,
    addWithdrawAddress,
    listWithdrawAddresses,
    deleteWithdrawAddress,
    getPreferences,
    updatePreferences,
    listFees,
    createGift,
    claimGift,
    listGifts,
    listReferrals,
    listAnnouncements,
    listHelpArticles,
    createSupportTicket,
    getSupportTicketById,
    listSupportTickets,
    addSupportMessage,
    setSupportEscalation,
    listSupportMessages,
    deleteAccount
  };
}

module.exports = {
  createUserCenterStore,
  normalizeEmail,
  normalizeCoin,
  normalizeNetwork,
  normalizeKycStatus,
  SUPPORTED_COINS,
  SUPPORTED_NETWORKS_BY_COIN
};
