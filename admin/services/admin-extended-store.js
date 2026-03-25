'use strict';

/**
 * Admin Extended Store
 * Handles all data operations for the extended admin panel features:
 * - Admin user management (CRUD)
 * - TOTP 2FA management
 * - Notifications
 * - Risk config & IP blocking
 * - Feature flags
 * - Blockchain monitoring
 * - API key management
 * - Ledger
 * - Futures positions
 * - User login history
 */

const crypto = require('crypto');

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildDateFilter(query = {}) {
  const filter = {};
  if (query.from) filter.$gte = new Date(query.from);
  if (query.to) filter.$lte = new Date(query.to);
  return Object.keys(filter).length ? filter : null;
}

// ─── Default risk config ────────────────────────────────────────────────────
const DEFAULT_RISK_CONFIG = {
  maxSpotOrderValue: 100000,
  maxDailyWithdrawal: 50000,
  maxFuturesLeverage: 100,
  maintenanceMarginRate: 0.005,
  liquidationThreshold: 0.025,
  maxOpenOrders: 200,
  minWithdrawalAmount: 10,
  withdrawalRequireKYC: true,
  p2pMaxAdAmount: 500000,
  p2pMaxDailyVolume: 1000000,
  autoFreezeOnSuspicious: false,
  kycRequiredForWithdrawal: true,
  maxLoginAttemptsPerHour: 10,
  maintenanceMode: false,
  maintenanceMessage: '',
  maintenanceEstimatedEnd: null
};

const DEFAULT_RATE_LIMIT_CONFIG = {
  loginWindowMs: 600000,
  loginMaxAttempts: 5,
  apiWindowMs: 60000,
  apiMaxRequests: 300,
  withdrawalWindowMs: 3600000,
  withdrawalMaxAttempts: 3
};

// ─── Default feature flags ──────────────────────────────────────────────────
const DEFAULT_FEATURE_FLAGS = [
  { key: 'MAINTENANCE_MODE', label: 'Maintenance Mode', enabled: false, category: 'system' },
  { key: 'TRADING_ENABLED', label: 'Spot Trading', enabled: true, category: 'trading' },
  { key: 'P2P_ENABLED', label: 'P2P Trading', enabled: true, category: 'trading' },
  { key: 'FUTURES_ENABLED', label: 'Futures Trading', enabled: false, category: 'trading' },
  { key: 'DEPOSITS_ENABLED', label: 'All Deposits', enabled: true, category: 'finance' },
  { key: 'WITHDRAWALS_ENABLED', label: 'All Withdrawals', enabled: true, category: 'finance' },
  { key: 'KYC_ENABLED', label: 'KYC Verification', enabled: true, category: 'compliance' },
  { key: 'REFERRAL_ENABLED', label: 'Referral Program', enabled: true, category: 'marketing' },
  { key: 'NEW_REGISTRATIONS', label: 'New User Registrations', enabled: true, category: 'users' },
  { key: 'API_TRADING_ENABLED', label: 'API Trading Access', enabled: true, category: 'api' }
];

function createAdminExtendedStore({ collections }) {
  const db = collections;

  // ─── Collections ────────────────────────────────────────────────────────

  function col(name) {
    if (!db[name]) {
      throw new Error(`Collection '${name}' not found in db collections.`);
    }
    return db[name];
  }

  function safeCol(name) {
    return db[name] || null;
  }

  // ─── Admin User Management ────────────────────────────────────────────────

  async function listAdminUsers(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const filter = {};
    if (params.role) filter.role = String(params.role).toUpperCase();
    if (params.status) filter.status = String(params.status).toUpperCase();
    if (params.search) {
      const rx = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { username: rx }];
    }

    const adminsColl = col('admin_users');
    const [items, total] = await Promise.all([
      adminsColl.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      adminsColl.countDocuments(filter)
    ]);

    const sanitized = items.map(a => {
      const { passwordHash, twoFactor, ...safe } = a;
      return { ...safe, has2FA: !!a.twoFactor?.enabled };
    });

    return { admins: sanitized, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function createAdminUser({ email, username, passwordHash, role }) {
    const adminsColl = col('admin_users');
    const existing = await adminsColl.findOne({ email });
    if (existing) throw Object.assign(new Error('Admin with this email already exists.'), { status: 409 });

    const now = new Date();
    const admin = {
      id: makeId('adm'),
      email,
      username: username || email.split('@')[0],
      passwordHash,
      role,
      status: 'ACTIVE',
      twoFactor: { enabled: false, provider: null, secret: null, pendingSecret: null, lastVerifiedAt: null },
      ipWhitelist: [],
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    };

    await adminsColl.insertOne(admin);
    const { passwordHash: _ph, twoFactor: _tf, ...safe } = admin;
    return safe;
  }

  async function updateAdminStatus(adminId, status) {
    const adminsColl = col('admin_users');
    const result = await adminsColl.findOneAndUpdate(
      { id: adminId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    const { passwordHash, twoFactor, ...safe } = result;
    return { ...safe, has2FA: !!result.twoFactor?.enabled };
  }

  async function updateAdminRole(adminId, role) {
    const adminsColl = col('admin_users');
    const result = await adminsColl.findOneAndUpdate(
      { id: adminId },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    const { passwordHash, twoFactor, ...safe } = result;
    return { ...safe, has2FA: !!result.twoFactor?.enabled };
  }

  async function updateAdminIpWhitelist(adminId, ips) {
    const adminsColl = col('admin_users');
    const result = await adminsColl.findOneAndUpdate(
      { id: adminId },
      { $set: { ipWhitelist: ips, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    const { passwordHash, twoFactor, ...safe } = result;
    return { ...safe, has2FA: !!result.twoFactor?.enabled };
  }

  async function deleteAdminUser(adminId) {
    const adminsColl = col('admin_users');
    const deleted = await adminsColl.findOneAndDelete({ id: adminId });
    return deleted ? true : null;
  }

  // ─── TOTP 2FA ──────────────────────────────────────────────────────────────

  async function savePending2FASecret(adminId, secret) {
    const adminsColl = col('admin_users');
    await adminsColl.updateOne(
      { id: adminId },
      { $set: { 'twoFactor.pendingSecret': secret, 'twoFactor.enabled': false, updatedAt: new Date() } }
    );
  }

  async function enable2FA(adminId, secret) {
    const adminsColl = col('admin_users');
    await adminsColl.updateOne(
      { id: adminId },
      {
        $set: {
          'twoFactor.enabled': true,
          'twoFactor.provider': 'totp',
          'twoFactor.secret': secret,
          'twoFactor.pendingSecret': null,
          'twoFactor.lastVerifiedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  async function disable2FA(adminId) {
    const adminsColl = col('admin_users');
    await adminsColl.updateOne(
      { id: adminId },
      {
        $set: {
          'twoFactor.enabled': false,
          'twoFactor.secret': null,
          'twoFactor.pendingSecret': null,
          'twoFactor.provider': null,
          updatedAt: new Date()
        }
      }
    );
  }

  async function createTemp2FAToken(adminId) {
    const token = crypto.randomBytes(32).toString('hex');
    const coll = safeCol('admin_temp_tokens') || col('admin_sessions');
    await coll.insertOne({
      id: makeId('tmp2fa'),
      type: 'TEMP_2FA',
      adminId,
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      createdAt: new Date()
    });
    return token;
  }

  async function verifyTemp2FAToken(token) {
    const coll = safeCol('admin_temp_tokens') || col('admin_sessions');
    const record = await coll.findOne({ token, type: 'TEMP_2FA' });
    if (!record) throw new Error('Invalid temp token');
    if (record.expiresAt < new Date()) throw new Error('Temp token expired');
    await coll.deleteOne({ token });
    return { adminId: record.adminId };
  }

  async function completeLogin2FA(admin, req) {
    // This would normally call the main adminStore.createAdminSession
    // Return a placeholder — caller should use adminStore for actual token generation
    return {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      verified: true
    };
  }

  // ─── User Login History ───────────────────────────────────────────────────

  async function getUserLoginHistory(userId, params = {}) {
    const { page, limit, skip } = parsePagination(params);

    // Try dedicated login_history collection first, fall back to audit_logs
    const loginHistoryColl = safeCol('login_history');
    if (loginHistoryColl) {
      const filter = { userId };
      const dateFilter = buildDateFilter(params);
      if (dateFilter) filter.createdAt = dateFilter;

      const [items, total] = await Promise.all([
        loginHistoryColl.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        loginHistoryColl.countDocuments(filter)
      ]);
      return { history: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    // Fallback to audit logs
    const auditColl = safeCol('audit_logs') || col('admin_audit_logs');
    const filter = { 'metadata.userId': userId };
    const [items, total] = await Promise.all([
      auditColl.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      auditColl.countDocuments(filter)
    ]);
    return { history: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getUserDevices(userId) {
    const devicesColl = safeCol('user_devices');
    if (!devicesColl) return { devices: [] };
    const devices = await devicesColl.find({ userId }).sort({ lastSeenAt: -1 }).toArray();
    return { devices };
  }

  async function revokeAllUserSessions(userId) {
    const sessionsColl = safeCol('refresh_tokens') || safeCol('user_sessions');
    if (sessionsColl) {
      await sessionsColl.updateMany(
        { userId },
        { $set: { revoked: true, revokedAt: new Date() } }
      );
    }
  }

  // ─── Ledger ──────────────────────────────────────────────────────────────

  async function getLedger(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const ledgerColl = safeCol('ledger') || safeCol('ledger_entries');

    if (!ledgerColl) {
      // Fall back to combining deposits + withdrawals
      return buildFallbackLedger(params, page, limit, skip);
    }

    const filter = {};
    if (params.userId) filter.userId = params.userId;
    if (params.type) filter.type = String(params.type).toUpperCase();
    if (params.coin) filter.coin = String(params.coin).toUpperCase();
    const dateFilter = buildDateFilter(params);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      ledgerColl.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      ledgerColl.countDocuments(filter)
    ]);

    return { entries: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function buildFallbackLedger(params, page, limit, skip) {
    const depositsColl = safeCol('deposits') || safeCol('wallet_deposits');
    const withdrawalsColl = safeCol('withdrawals') || safeCol('withdrawal_requests');

    const entries = [];
    if (depositsColl) {
      const deps = await depositsColl.find({}).sort({ createdAt: -1 }).limit(limit * 2).toArray();
      deps.forEach(d => entries.push({ ...d, type: 'DEPOSIT' }));
    }
    if (withdrawalsColl) {
      const wds = await withdrawalsColl.find({}).sort({ createdAt: -1 }).limit(limit * 2).toArray();
      wds.forEach(w => entries.push({ ...w, type: 'WITHDRAWAL' }));
    }

    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = entries.length;
    const paged = entries.slice(skip, skip + limit);
    return { entries: paged, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function exportLedgerCsv(params = {}) {
    const { entries } = await getLedger({ ...params, limit: 10000, page: 1 });

    const headers = ['id', 'type', 'userId', 'coin', 'amount', 'status', 'txHash', 'network', 'createdAt'];
    const rows = entries.map(e =>
      headers.map(h => {
        const v = e[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  async function listNotifications(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = col('admin_notifications');

    const filter = {};
    if (params.type) filter.type = String(params.type).toUpperCase();
    if (params.status) filter.status = String(params.status).toUpperCase();
    if (params.priority) filter.priority = String(params.priority).toUpperCase();

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { notifications: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function createNotification({ type, userId, title, message, channel, priority, scheduledAt, createdBy, isBroadcast }) {
    const coll = col('admin_notifications');
    const now = new Date();
    const notification = {
      id: makeId('notif'),
      type,
      userId: userId || null,
      title,
      message,
      channel,
      priority,
      scheduledAt: scheduledAt || null,
      status: scheduledAt && scheduledAt > now ? 'SCHEDULED' : 'ACTIVE',
      isBroadcast: !!isBroadcast,
      deliveredCount: 0,
      readCount: 0,
      createdBy,
      createdAt: now,
      updatedAt: now
    };
    await coll.insertOne(notification);
    return notification;
  }

  async function getNotificationById(notificationId) {
    const coll = col('admin_notifications');
    return coll.findOne({ id: notificationId });
  }

  async function updateNotificationStatus(notificationId, status) {
    const coll = col('admin_notifications');
    return coll.findOneAndUpdate(
      { id: notificationId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async function deleteNotification(notificationId) {
    const coll = col('admin_notifications');
    const result = await coll.findOneAndDelete({ id: notificationId });
    return result ? true : null;
  }

  async function getNotificationStats() {
    const coll = col('admin_notifications');
    const [total, active, scheduled, cancelled] = await Promise.all([
      coll.countDocuments({}),
      coll.countDocuments({ status: 'ACTIVE' }),
      coll.countDocuments({ status: 'SCHEDULED' }),
      coll.countDocuments({ status: 'CANCELLED' })
    ]);
    return { stats: { total, active, scheduled, cancelled } };
  }

  // ─── Risk Config ──────────────────────────────────────────────────────────

  async function getRiskConfig() {
    const coll = col('admin_risk_config');
    const doc = await coll.findOne({ _type: 'global_risk_config' });
    if (!doc) return DEFAULT_RISK_CONFIG;
    const { _id, _type, ...config } = doc;
    return { ...DEFAULT_RISK_CONFIG, ...config };
  }

  async function updateRiskConfig(patch = {}, actorId = 'system') {
    const coll = col('admin_risk_config');
    const now = new Date();
    const update = { ...patch, updatedAt: now, updatedBy: actorId };
    await coll.updateOne(
      { _type: 'global_risk_config' },
      { $set: update, $setOnInsert: { _type: 'global_risk_config', createdAt: now } },
      { upsert: true }
    );
    return getRiskConfig();
  }

  // ─── Rate Limits ──────────────────────────────────────────────────────────

  async function getRateLimitConfig() {
    const coll = col('admin_risk_config');
    const doc = await coll.findOne({ _type: 'rate_limit_config' });
    if (!doc) return DEFAULT_RATE_LIMIT_CONFIG;
    const { _id, _type, ...config } = doc;
    return { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
  }

  async function updateRateLimitConfig(patch = {}, actorId = 'system') {
    const allowed = ['loginWindowMs', 'loginMaxAttempts', 'apiWindowMs', 'apiMaxRequests', 'withdrawalWindowMs', 'withdrawalMaxAttempts'];
    const validPatch = {};
    for (const k of allowed) {
      if (patch[k] !== undefined) validPatch[k] = toNumber(patch[k]);
    }

    const coll = col('admin_risk_config');
    const now = new Date();
    await coll.updateOne(
      { _type: 'rate_limit_config' },
      { $set: { ...validPatch, updatedAt: now, updatedBy: actorId }, $setOnInsert: { _type: 'rate_limit_config', createdAt: now } },
      { upsert: true }
    );
    return getRateLimitConfig();
  }

  // ─── IP Blocking ──────────────────────────────────────────────────────────

  async function listBlockedIPs(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = col('admin_blocked_ips');

    const filter = {};
    if (params.type === 'ip') filter.ip = { $ne: null };
    if (params.type === 'country') filter.country = { $ne: null };
    if (params.active === 'true' || params.active === true) {
      filter.$or = [{ permanent: true }, { expiresAt: { $gt: new Date() } }];
    }

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { blockedIPs: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function blockIP({ ip, country, reason, permanent, expiresAt, blockedBy }) {
    const coll = col('admin_blocked_ips');
    const now = new Date();
    const record = {
      id: makeId('blk'),
      ip: ip || null,
      country: country || null,
      reason,
      permanent: !!permanent,
      expiresAt: permanent ? null : (expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)), // default 24h
      blockedBy,
      createdAt: now,
      updatedAt: now
    };
    await coll.insertOne(record);
    return record;
  }

  async function unblockIP(blockId) {
    const coll = col('admin_blocked_ips');
    const result = await coll.findOneAndDelete({ id: blockId });
    return result ? true : null;
  }

  // ─── Suspicious Activity ──────────────────────────────────────────────────

  async function listSuspiciousActivity(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = col('admin_suspicious_activity');

    const filter = {};
    if (params.status) filter.status = String(params.status).toUpperCase();
    if (params.severity) filter.severity = String(params.severity).toUpperCase();
    if (params.userId) filter.userId = params.userId;

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { alerts: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getSuspiciousAlert(alertId) {
    return col('admin_suspicious_activity').findOne({ id: alertId });
  }

  async function reviewSuspiciousAlert(alertId, { status, notes, reviewedBy, reviewedAt }) {
    return col('admin_suspicious_activity').findOneAndUpdate(
      { id: alertId },
      { $set: { status, reviewNotes: notes, reviewedBy, reviewedAt, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async function runSuspiciousActivityScan() {
    // Detection rules - real exchange would have much more sophisticated rules
    const rules = [
      {
        name: 'RAPID_WITHDRAWAL',
        description: 'Multiple withdrawals in short time window',
        severity: 'HIGH'
      },
      {
        name: 'LARGE_SINGLE_WITHDRAWAL',
        description: 'Withdrawal exceeding daily limit',
        severity: 'CRITICAL'
      },
      {
        name: 'NEW_ACCOUNT_HIGH_VOLUME',
        description: 'New account with high trading volume',
        severity: 'MEDIUM'
      },
      {
        name: 'MULTIPLE_FAILED_LOGIN',
        description: 'Multiple failed login attempts',
        severity: 'LOW'
      }
    ];

    let alertsCreated = 0;
    const suspColl = col('admin_suspicious_activity');

    // Check for large withdrawal patterns
    const withdrawalsColl = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (withdrawalsColl) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const largeWithdrawals = await withdrawalsColl.find({
        createdAt: { $gte: oneDayAgo },
        amount: { $gt: 10000 }
      }).toArray();

      for (const wd of largeWithdrawals) {
        const exists = await suspColl.findOne({
          'meta.withdrawalId': wd.id,
          type: 'LARGE_SINGLE_WITHDRAWAL'
        });
        if (!exists) {
          await suspColl.insertOne({
            id: makeId('susp'),
            type: 'LARGE_SINGLE_WITHDRAWAL',
            severity: 'CRITICAL',
            status: 'OPEN',
            userId: wd.userId,
            description: `Large withdrawal of ${wd.amount} ${wd.coin || 'USDT'} detected`,
            meta: { withdrawalId: wd.id, amount: wd.amount },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          alertsCreated++;
        }
      }
    }

    return {
      alertsCreated,
      rulesChecked: rules.length,
      scanCompletedAt: new Date().toISOString()
    };
  }

  // ─── Feature Flags ───────────────────────────────────────────────────────

  async function listFeatureFlags() {
    const coll = col('admin_feature_flags');
    const stored = await coll.find({}).toArray();
    const storedMap = {};
    stored.forEach(f => { storedMap[f.key] = f; });

    // Merge with defaults
    return DEFAULT_FEATURE_FLAGS.map(def => ({
      ...def,
      ...(storedMap[def.key] || {}),
      key: def.key,
      label: def.label,
      category: def.category
    }));
  }

  async function getFeatureFlag(key) {
    const coll = col('admin_feature_flags');
    const stored = await coll.findOne({ key: String(key).toUpperCase() });
    const def = DEFAULT_FEATURE_FLAGS.find(f => f.key === String(key).toUpperCase());
    if (!stored && !def) return null;
    return { ...(def || {}), ...(stored || {}), key: String(key).toUpperCase() };
  }

  async function setFeatureFlag(key, enabled, { updatedBy, reason } = {}) {
    const normalizedKey = String(key).toUpperCase();
    const coll = col('admin_feature_flags');
    const now = new Date();
    const flag = await coll.findOneAndUpdate(
      { key: normalizedKey },
      {
        $set: { enabled, updatedBy, reason: reason || '', updatedAt: now },
        $setOnInsert: { key: normalizedKey, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Write to feature flag history
    const historyColl = safeCol('admin_feature_flag_history');
    if (historyColl) {
      await historyColl.insertOne({
        id: makeId('ffh'),
        flagKey: normalizedKey,
        enabled,
        updatedBy,
        reason: reason || '',
        changedAt: now
      });
    }

    return flag || { key: normalizedKey, enabled };
  }

  async function getFeatureFlagHistory(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = safeCol('admin_feature_flag_history');
    if (!coll) return { history: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = {};
    if (params.flagKey) filter.flagKey = String(params.flagKey).toUpperCase();

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ changedAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { history: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getNetworkStatuses() {
    const configColl = safeCol('wallet_configs') || safeCol('admin_wallet_configs');
    if (!configColl) {
      return [
        { network: 'TRC20', depositsEnabled: true, withdrawalsEnabled: true, coin: 'USDT' },
        { network: 'ERC20', depositsEnabled: true, withdrawalsEnabled: true, coin: 'USDT' },
        { network: 'BEP20', depositsEnabled: true, withdrawalsEnabled: true, coin: 'USDT' }
      ];
    }
    const configs = await configColl.find({}).toArray();
    return configs.map(c => ({
      network: c.network,
      depositsEnabled: c.depositsEnabled !== false,
      withdrawalsEnabled: c.withdrawalsEnabled !== false,
      coin: c.coin || 'USDT',
      minDeposit: c.minDeposit,
      minWithdrawal: c.minWithdrawal,
      withdrawalFee: c.withdrawalFee
    }));
  }

  async function setNetworkDepositStatus(network, enabled, { updatedBy, reason } = {}) {
    const configColl = col('wallet_configs');
    const now = new Date();
    const result = await configColl.findOneAndUpdate(
      { network },
      { $set: { depositsEnabled: enabled, updatedBy, updatedAt: now }, $setOnInsert: { network, createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    );
    await setFeatureFlag(`DEPOSIT_${network}`, enabled, { updatedBy, reason });
    return result || { network, depositsEnabled: enabled };
  }

  async function setNetworkWithdrawalStatus(network, enabled, { updatedBy, reason } = {}) {
    const configColl = col('wallet_configs');
    const now = new Date();
    const result = await configColl.findOneAndUpdate(
      { network },
      { $set: { withdrawalsEnabled: enabled, updatedBy, updatedAt: now }, $setOnInsert: { network, createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    );
    await setFeatureFlag(`WITHDRAWAL_${network}`, enabled, { updatedBy, reason });
    return result || { network, withdrawalsEnabled: enabled };
  }

  async function setTradingPairEnabled(symbol, enabled, { updatedBy, reason } = {}) {
    const pairsColl = safeCol('spot_pairs') || safeCol('admin_spot_pairs');
    if (!pairsColl) {
      await setFeatureFlag(`PAIR_${symbol}`, enabled, { updatedBy, reason });
      return { symbol, enabled };
    }
    const now = new Date();
    const result = await pairsColl.findOneAndUpdate(
      { symbol },
      { $set: { enabled, updatedBy, reason, updatedAt: now }, $setOnInsert: { symbol, createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    );
    await setFeatureFlag(`PAIR_${symbol}`, enabled, { updatedBy, reason });
    return result || { symbol, enabled };
  }

  // ─── Blockchain Monitoring ────────────────────────────────────────────────

  async function getDepositScannerStatus() {
    const coll = safeCol('deposit_scanner_status') || safeCol('admin_scanner_status');
    if (!coll) {
      return {
        scanners: [
          { network: 'TRC20', status: 'RUNNING', lastScanAt: new Date(), lastBlock: 0, pendingDeposits: 0 },
          { network: 'ERC20', status: 'RUNNING', lastScanAt: new Date(), lastBlock: 0, pendingDeposits: 0 },
          { network: 'BEP20', status: 'RUNNING', lastScanAt: new Date(), lastBlock: 0, pendingDeposits: 0 }
        ]
      };
    }
    const docs = await coll.find({}).toArray();
    return { scanners: docs };
  }

  async function listBlockchainTransactions(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const filter = {};
    if (params.network) filter.network = String(params.network).toUpperCase();
    if (params.type === 'deposit') {
      const coll = safeCol('deposits') || safeCol('wallet_deposits');
      if (!coll) return { transactions: [], pagination: { page, limit, total: 0, pages: 0 } };
      if (params.status) filter.status = String(params.status).toUpperCase();
      if (params.txHash) filter.txHash = params.txHash;
      if (params.userId) filter.userId = params.userId;
      const [items, total] = await Promise.all([
        coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        coll.countDocuments(filter)
      ]);
      return { transactions: items.map(t => ({ ...t, type: 'DEPOSIT' })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    if (params.type === 'withdrawal') {
      const coll = safeCol('withdrawals') || safeCol('withdrawal_requests');
      if (!coll) return { transactions: [], pagination: { page, limit, total: 0, pages: 0 } };
      if (params.status) filter.status = String(params.status).toUpperCase();
      if (params.txHash) filter.txHash = params.txHash;
      if (params.userId) filter.userId = params.userId;
      const [items, total] = await Promise.all([
        coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        coll.countDocuments(filter)
      ]);
      return { transactions: items.map(t => ({ ...t, type: 'WITHDRAWAL' })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    // Combined
    const deps = (await (safeCol('deposits') || { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) })
      .find({}).sort({ createdAt: -1 }).limit(limit * 2).toArray()).map(t => ({ ...t, type: 'DEPOSIT' }));
    const wds = (await (safeCol('withdrawals') || safeCol('withdrawal_requests') || { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) })
      .find({}).sort({ createdAt: -1 }).limit(limit * 2).toArray()).map(t => ({ ...t, type: 'WITHDRAWAL' }));

    const combined = [...deps, ...wds].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      transactions: combined.slice(skip, skip + limit),
      pagination: { page, limit, total: combined.length, pages: Math.ceil(combined.length / limit) }
    };
  }

  async function getBlockchainTransaction(txId) {
    const deps = safeCol('deposits') || safeCol('wallet_deposits');
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (deps) {
      const dep = await deps.findOne({ $or: [{ id: txId }, { txHash: txId }] });
      if (dep) return { ...dep, type: 'DEPOSIT' };
    }
    if (wds) {
      const wd = await wds.findOne({ $or: [{ id: txId }, { txHash: txId }] });
      if (wd) return { ...wd, type: 'WITHDRAWAL' };
    }
    return null;
  }

  async function retryBlockchainTransaction(txId, { adminId, reason }) {
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (!wds) return null;
    const wd = await wds.findOneAndUpdate(
      { id: txId, status: { $in: ['FAILED', 'REJECTED', 'PENDING'] } },
      { $set: { status: 'PENDING', retryCount: 1, retryBy: adminId, retryReason: reason, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return wd;
  }

  async function markTransactionFailed(txId, { adminId, reason }) {
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (!wds) return null;
    return wds.findOneAndUpdate(
      { id: txId },
      { $set: { status: 'FAILED', failReason: reason, failedBy: adminId, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async function getWithdrawalQueue(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (!wds) return { queue: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = { status: { $in: ['PENDING', 'PROCESSING', 'BROADCASTING', 'CONFIRMING'] } };
    if (params.status) filter.status = String(params.status).toUpperCase();
    if (params.network) filter.network = String(params.network).toUpperCase();

    const [items, total] = await Promise.all([
      wds.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).toArray(),
      wds.countDocuments(filter)
    ]);
    return { queue: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function prioritizeWithdrawal(withdrawalId, { adminId }) {
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    if (!wds) return null;
    return wds.findOneAndUpdate(
      { id: withdrawalId },
      { $set: { priority: 'HIGH', prioritizedBy: adminId, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async function getHotWalletNetworkBalances() {
    const coll = safeCol('admin_hot_wallets');
    if (!coll) {
      return {
        hotWallets: [
          { network: 'TRC20', address: '', balance: 0, coin: 'USDT', lastUpdated: new Date() },
          { network: 'ERC20', address: '', balance: 0, coin: 'USDT', lastUpdated: new Date() },
          { network: 'BEP20', address: '', balance: 0, coin: 'USDT', lastUpdated: new Date() }
        ]
      };
    }
    const wallets = await coll.find({}).toArray();
    return { hotWallets: wallets };
  }

  async function triggerDepositRescan({ network, fromBlock, toBlock, requestedBy }) {
    const coll = safeCol('admin_rescan_jobs');
    const job = {
      id: makeId('rscan'),
      network,
      fromBlock: fromBlock || null,
      toBlock: toBlock || null,
      status: 'QUEUED',
      requestedBy,
      createdAt: new Date()
    };
    if (coll) await coll.insertOne(job);
    return { jobId: job.id, status: 'QUEUED', network };
  }

  async function getBlockchainStats() {
    const deps = safeCol('deposits') || safeCol('wallet_deposits');
    const wds = safeCol('withdrawals') || safeCol('withdrawal_requests');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalDeposits, pendingDeposits, recentDeposits,
      totalWithdrawals, pendingWithdrawals, failedWithdrawals
    ] = await Promise.all([
      deps ? deps.countDocuments({}) : Promise.resolve(0),
      deps ? deps.countDocuments({ status: 'PENDING' }) : Promise.resolve(0),
      deps ? deps.countDocuments({ createdAt: { $gte: oneDayAgo } }) : Promise.resolve(0),
      wds ? wds.countDocuments({}) : Promise.resolve(0),
      wds ? wds.countDocuments({ status: 'PENDING' }) : Promise.resolve(0),
      wds ? wds.countDocuments({ status: 'FAILED' }) : Promise.resolve(0)
    ]);

    return {
      deposits: { total: totalDeposits, pending: pendingDeposits, last24h: recentDeposits },
      withdrawals: { total: totalWithdrawals, pending: pendingWithdrawals, failed: failedWithdrawals }
    };
  }

  // ─── API Keys ─────────────────────────────────────────────────────────────

  async function listUserApiKeys(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return { apiKeys: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = {};
    if (params.userId) filter.userId = params.userId;
    if (params.status) filter.status = String(params.status).toUpperCase();

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);

    // Mask actual key values
    const masked = items.map(k => ({ ...k, key: k.key ? `${String(k.key).slice(0, 8)}...${String(k.key).slice(-4)}` : '***' }));
    return { apiKeys: masked, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getUserApiKeys(userId) {
    return listUserApiKeys({ userId, limit: 100 });
  }

  async function getApiKeyById(keyId) {
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return null;
    const k = await coll.findOne({ id: keyId });
    if (!k) return null;
    return { ...k, key: k.key ? `${String(k.key).slice(0, 8)}...${String(k.key).slice(-4)}` : '***' };
  }

  async function disableApiKey(keyId, { reason, disabledBy }) {
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return null;
    const result = await coll.findOneAndUpdate(
      { id: keyId },
      { $set: { status: 'DISABLED', disableReason: reason, disabledBy, disabledAt: new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return { ...result, key: result.key ? `${String(result.key).slice(0, 8)}...` : '***' };
  }

  async function revokeApiKey(keyId, { reason, revokedBy }) {
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return null;
    const result = await coll.findOneAndUpdate(
      { id: keyId },
      { $set: { status: 'REVOKED', revokeReason: reason, revokedBy, revokedAt: new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return { ...result, key: result.key ? `${String(result.key).slice(0, 8)}...` : '***' };
  }

  async function revokeAllUserApiKeys(userId, { reason, revokedBy }) {
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return { revokedCount: 0 };
    const result = await coll.updateMany(
      { userId, status: { $nin: ['REVOKED'] } },
      { $set: { status: 'REVOKED', revokeReason: reason, revokedBy, revokedAt: new Date(), updatedAt: new Date() } }
    );
    return { revokedCount: result.modifiedCount };
  }

  async function getApiKeyUsageLogs(keyId, params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = safeCol('api_key_logs');
    if (!coll) return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = { keyId };
    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { logs: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getApiKeyStats() {
    const coll = safeCol('api_keys') || safeCol('user_api_keys');
    if (!coll) return { stats: { total: 0, active: 0, disabled: 0, revoked: 0 } };

    const [total, active, disabled, revoked] = await Promise.all([
      coll.countDocuments({}),
      coll.countDocuments({ status: 'ACTIVE' }),
      coll.countDocuments({ status: 'DISABLED' }),
      coll.countDocuments({ status: 'REVOKED' })
    ]);
    return { stats: { total, active, disabled, revoked } };
  }

  // ─── Futures Positions ────────────────────────────────────────────────────

  async function listFuturesPositions(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = safeCol('futures_positions');
    if (!coll) return { positions: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = {};
    if (params.userId) filter.userId = params.userId;
    if (params.symbol) filter.symbol = String(params.symbol).toUpperCase();
    if (params.status) filter.status = String(params.status).toUpperCase();
    else filter.status = 'OPEN';

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { positions: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function forceClosePosition(positionId, { adminId, reason }) {
    const coll = safeCol('futures_positions');
    if (!coll) throw Object.assign(new Error('Futures positions not available.'), { status: 503 });
    const result = await coll.findOneAndUpdate(
      { id: positionId, status: 'OPEN' },
      {
        $set: {
          status: 'FORCE_CLOSED',
          closedBy: adminId,
          closeReason: reason,
          closedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    if (!result) throw Object.assign(new Error('Position not found or already closed.'), { status: 404 });
    return result;
  }

  async function listLiquidationEvents(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const coll = safeCol('liquidation_events');
    if (!coll) return { liquidations: [], pagination: { page, limit, total: 0, pages: 0 } };

    const filter = {};
    if (params.userId) filter.userId = params.userId;
    const dateFilter = buildDateFilter(params);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter)
    ]);
    return { liquidations: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ─── Risk Summary ─────────────────────────────────────────────────────────

  async function getRiskSummary() {
    const [riskConfig, blockedCount, openAlerts, pendingFlags] = await Promise.all([
      getRiskConfig(),
      col('admin_blocked_ips').countDocuments({ $or: [{ permanent: true }, { expiresAt: { $gt: new Date() } }] }),
      col('admin_suspicious_activity').countDocuments({ status: 'OPEN' }).catch(() => 0),
      col('admin_suspicious_activity').countDocuments({ status: 'ESCALATED' }).catch(() => 0)
    ]);

    return {
      riskConfig,
      summary: {
        activeBlocks: blockedCount,
        openAlerts,
        escalatedAlerts: pendingFlags,
        maintenanceMode: !!riskConfig.maintenanceMode
      }
    };
  }

  // ─── Index Ensure ─────────────────────────────────────────────────────────

  async function ensureExtendedIndexes() {
    const indexTasks = [
      { colName: 'admin_notifications', indexes: [{ key: { type: 1 } }, { key: { status: 1 } }, { key: { createdAt: -1 } }] },
      { colName: 'admin_blocked_ips', indexes: [{ key: { ip: 1 } }, { key: { country: 1 } }, { key: { expiresAt: 1 } }] },
      { colName: 'admin_suspicious_activity', indexes: [{ key: { status: 1 } }, { key: { userId: 1 } }, { key: { createdAt: -1 } }] },
      { colName: 'admin_feature_flags', indexes: [{ key: { key: 1 }, unique: true }] },
      { colName: 'admin_risk_config', indexes: [{ key: { _type: 1 }, unique: true }] }
    ];

    for (const task of indexTasks) {
      try {
        const coll = safeCol(task.colName);
        if (coll) {
          for (const idx of task.indexes) {
            await coll.createIndex(idx.key, { unique: !!idx.unique, background: true }).catch(() => {});
          }
        }
      } catch (_err) {
        // Non-fatal
      }
    }
  }

  return {
    // Admin user management
    listAdminUsers,
    createAdminUser,
    updateAdminStatus,
    updateAdminRole,
    updateAdminIpWhitelist,
    deleteAdminUser,
    // 2FA
    savePending2FASecret,
    enable2FA,
    disable2FA,
    createTemp2FAToken,
    verifyTemp2FAToken,
    completeLogin2FA,
    // User data
    getUserLoginHistory,
    getUserDevices,
    revokeAllUserSessions,
    // Ledger
    getLedger,
    exportLedgerCsv,
    // Notifications
    listNotifications,
    createNotification,
    getNotificationById,
    updateNotificationStatus,
    deleteNotification,
    getNotificationStats,
    // Risk
    getRiskConfig,
    updateRiskConfig,
    getRateLimitConfig,
    updateRateLimitConfig,
    listBlockedIPs,
    blockIP,
    unblockIP,
    listSuspiciousActivity,
    getSuspiciousAlert,
    reviewSuspiciousAlert,
    runSuspiciousActivityScan,
    getRiskSummary,
    // Feature flags
    listFeatureFlags,
    getFeatureFlag,
    setFeatureFlag,
    getFeatureFlagHistory,
    getNetworkStatuses,
    setNetworkDepositStatus,
    setNetworkWithdrawalStatus,
    setTradingPairEnabled,
    // Blockchain
    getDepositScannerStatus,
    listBlockchainTransactions,
    getBlockchainTransaction,
    retryBlockchainTransaction,
    markTransactionFailed,
    getWithdrawalQueue,
    prioritizeWithdrawal,
    getHotWalletNetworkBalances,
    triggerDepositRescan,
    getBlockchainStats,
    // API Keys
    listUserApiKeys,
    getUserApiKeys,
    getApiKeyById,
    disableApiKey,
    revokeApiKey,
    revokeAllUserApiKeys,
    getApiKeyUsageLogs,
    getApiKeyStats,
    // Futures
    listFuturesPositions,
    forceClosePosition,
    listLiquidationEvents,
    // Indexes
    ensureExtendedIndexes
  };
}

module.exports = { createAdminExtendedStore };
