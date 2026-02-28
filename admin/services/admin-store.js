const crypto = require('crypto');

const ADMIN_ROLES = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'];
const USER_STATUSES = ['ACTIVE', 'FROZEN', 'BANNED'];
const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function toDate(value, fallback = Date.now()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback);
  }
  return parsed;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function getAvailableBalance(wallet) {
  if (!wallet) {
    return 0;
  }
  if (wallet.availableBalance !== undefined && wallet.availableBalance !== null) {
    return toNumber(wallet.availableBalance, 0);
  }
  return toNumber(wallet.balance, 0);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function normalizeAdminRole(role) {
  const normalized = String(role || '').trim().toUpperCase();
  if (ADMIN_ROLES.includes(normalized)) {
    return normalized;
  }
  return 'SUPER_ADMIN';
}

function normalizeUserStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (USER_STATUSES.includes(normalized)) {
    return normalized;
  }
  return 'ACTIVE';
}

function normalizeWithdrawalStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (WITHDRAWAL_STATUSES.includes(normalized)) {
    return normalized;
  }
  return 'PENDING';
}

function makeP2PUserId(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const userHash = crypto.createHash('sha1').update(normalizedEmail).digest('hex').slice(0, 16);
  return `usr_${userHash}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim().toLowerCase());
}

function normalizeAdminUsername(rawUsername, fallbackEmail = '') {
  const candidateFromEmail = String(fallbackEmail || '').trim().toLowerCase().split('@')[0] || '';
  const normalized = String(rawUsername || candidateFromEmail || 'admin')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);

  if (normalized.length >= 3) {
    return normalized;
  }

  return 'admin';
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeAdmin(admin) {
  if (!admin) {
    return null;
  }
  return {
    id: String(admin.id || '').trim(),
    email: String(admin.email || '').trim().toLowerCase(),
    username: normalizeAdminUsername(admin.username, admin.email),
    role: normalizeAdminRole(admin.role),
    status: String(admin.status || 'ACTIVE').trim().toUpperCase(),
    twoFactorEnabled: Boolean(admin.twoFactor?.enabled),
    createdAt: admin.createdAt ? toDate(admin.createdAt).toISOString() : null,
    updatedAt: admin.updatedAt ? toDate(admin.updatedAt).toISOString() : null,
    lastLoginAt: admin.lastLoginAt ? toDate(admin.lastLoginAt).toISOString() : null
  };
}

function getDefaultPlatformSettings() {
  return {
    siteName: 'Bitegit Exchange',
    logoUrl: '',
    maintenanceMode: false,
    announcementBanner: '',
    referralCommissionPercent: 10,
    signupBonusUsdt: 0,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpSecure: false,
    features: {
      spotEnabled: true,
      p2pEnabled: true,
      walletEnabled: true,
      referralsEnabled: true,
      supportEnabled: true
    },
    globalTradingFees: {
      maker: 0.001,
      taker: 0.001
    },
    compliance: {
      requireKycBeforeWithdrawal: false,
      amlRiskThreshold: 75
    }
  };
}

function createAdminStore({ collections, repos, walletService, tokenService, isDbConnected }) {
  const {
    adminUsers,
    adminUserProfiles,
    adminSessionsV2,
    adminRefreshTokens,
    adminAuditLogs,
    adminLoginHistory,
    adminPlatformSettings,
    adminSupportTickets,
    adminWalletConfig,
    adminHotWallets,
    adminWithdrawals,
    adminDeposits,
    adminSpotPairs,
    adminP2PConfig,
    adminComplianceFlags,
    adminApiLogs,
    adminKycDocuments,
    p2pCredentials,
    p2pUserSessions,
    wallets,
    p2pOffers,
    p2pOrders,
    tradeOrders
  } = collections;

  async function ensureIndexes() {
    await Promise.all([
      adminUsers.createIndex({ id: 1 }, { unique: true }),
      adminUsers.createIndex({ email: 1 }, { unique: true }),
      adminUsers.createIndex({ username: 1 }),
      adminUsers.createIndex({ role: 1 }),
      adminSessionsV2.createIndex({ id: 1 }, { unique: true }),
      adminSessionsV2.createIndex({ adminId: 1 }),
      adminSessionsV2.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      adminRefreshTokens.createIndex({ tokenHash: 1 }, { unique: true }),
      adminRefreshTokens.createIndex({ adminId: 1 }, { unique: true }),
      adminRefreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      adminLoginHistory.createIndex({ createdAt: -1 }),
      adminAuditLogs.createIndex({ createdAt: -1 }),
      adminAuditLogs.createIndex({ adminId: 1, createdAt: -1 }),
      adminApiLogs.createIndex({ createdAt: -1 }),
      adminUserProfiles.createIndex({ userId: 1 }, { unique: true }),
      adminKycDocuments.createIndex({ userId: 1 }, { unique: true }),
      adminSupportTickets.createIndex({ id: 1 }, { unique: true }),
      adminSupportTickets.createIndex({ status: 1, updatedAt: -1 }),
      adminWalletConfig.createIndex({ coin: 1 }, { unique: true }),
      adminHotWallets.createIndex({ coin: 1 }, { unique: true }),
      adminWithdrawals.createIndex({ id: 1 }, { unique: true }),
      adminWithdrawals.createIndex({ status: 1, createdAt: -1 }),
      adminDeposits.createIndex({ id: 1 }, { unique: true }),
      adminDeposits.createIndex({ createdAt: -1 }),
      adminSpotPairs.createIndex({ symbol: 1 }, { unique: true }),
      adminComplianceFlags.createIndex({ id: 1 }, { unique: true }),
      adminComplianceFlags.createIndex({ createdAt: -1 }),
      adminP2PConfig.createIndex({ key: 1 }, { unique: true })
    ]);
  }

  async function ensureDefaults() {
    const settings = getDefaultPlatformSettings();
    await adminPlatformSettings.updateOne(
      { key: 'global' },
      {
        $setOnInsert: {
          key: 'global',
          value: settings,
          updatedBy: 'system',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    const spotPairsCount = await adminSpotPairs.countDocuments({});
    if (spotPairsCount === 0) {
      await adminSpotPairs.insertMany([
        { symbol: 'BTCUSDT', enabled: true, makerFee: 0.001, takerFee: 0.001, pricePrecision: 2, updatedAt: new Date() },
        { symbol: 'ETHUSDT', enabled: true, makerFee: 0.001, takerFee: 0.001, pricePrecision: 2, updatedAt: new Date() },
        { symbol: 'SOLUSDT', enabled: true, makerFee: 0.001, takerFee: 0.001, pricePrecision: 3, updatedAt: new Date() },
        { symbol: 'BNBUSDT', enabled: true, makerFee: 0.001, takerFee: 0.001, pricePrecision: 2, updatedAt: new Date() }
      ]);
    }

    const hotWalletCount = await adminHotWallets.countDocuments({});
    if (hotWalletCount === 0) {
      await adminHotWallets.insertMany([
        { coin: 'USDT', balance: 250000, network: 'TRC20', updatedAt: new Date() },
        { coin: 'BTC', balance: 42.5, network: 'BTC', updatedAt: new Date() },
        { coin: 'ETH', balance: 1330.22, network: 'ERC20', updatedAt: new Date() }
      ]);
    }

    const walletConfigCount = await adminWalletConfig.countDocuments({});
    if (walletConfigCount === 0) {
      await adminWalletConfig.insertMany([
        { coin: 'USDT', withdrawalsEnabled: true, networkFee: 1, minWithdrawal: 10, maxWithdrawal: 100000, updatedAt: new Date() },
        { coin: 'BTC', withdrawalsEnabled: true, networkFee: 0.0003, minWithdrawal: 0.001, maxWithdrawal: 50, updatedAt: new Date() },
        { coin: 'ETH', withdrawalsEnabled: true, networkFee: 0.003, minWithdrawal: 0.01, maxWithdrawal: 500, updatedAt: new Date() }
      ]);
    }

    await adminP2PConfig.updateOne(
      { key: 'global' },
      {
        $setOnInsert: {
          key: 'global',
          value: {
            p2pFeePercent: 0.1,
            minOrderLimit: 100,
            maxOrderLimit: 200000,
            autoExpiryMinutes: 15
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  async function seedAdminUser(seed = {}) {
    const requestedEmail = String(seed.email || '').trim().toLowerCase();
    const username = normalizeAdminUsername(seed.username, requestedEmail);
    const email = isValidEmail(requestedEmail) ? requestedEmail : `${username}@admin.local`;
    const password = String(seed.password || '').trim();
    if (!email || !password) {
      return null;
    }

    const role = normalizeAdminRole(seed.role || 'SUPER_ADMIN');
    const now = new Date();
    const forcePasswordSync = seed.forcePasswordSync === true;
    const forceRoleSync = seed.forceRoleSync === true;
    const forceActivate = seed.forceActivate === true;
    const existingByEmail = await adminUsers.findOne({ email });
    const existingByUsername = await adminUsers.findOne({ username });
    const existing = existingByEmail || existingByUsername;

    if (!existing) {
      const newAdmin = {
        id: makeId('adm'),
        email,
        username,
        passwordHash: repos.hashPassword(password),
        role,
        status: 'ACTIVE',
        twoFactor: {
          enabled: false,
          provider: 'totp',
          secret: '',
          lastVerifiedAt: null
        },
        ipWhitelist: [],
        createdAt: now,
        updatedAt: now
      };
      await adminUsers.insertOne(newAdmin);
      return newAdmin;
    }

    const updateFields = {
      updatedAt: now,
      username: normalizeAdminUsername(existing.username || username, existing.email || email)
    };

    if (!existing.email && email) {
      updateFields.email = email;
    }
    if (forcePasswordSync || !existing.passwordHash) {
      updateFields.passwordHash = repos.hashPassword(password);
    }
    if (forceRoleSync || !existing.role) {
      updateFields.role = role;
    }
    if (forceActivate) {
      updateFields.status = 'ACTIVE';
    }

    await adminUsers.updateOne(
      { id: existing.id },
      {
        $set: updateFields
      }
    );

    return getAdminById(existing.id);
  }

  async function getAdminByEmail(email) {
    return adminUsers.findOne({ email: String(email || '').trim().toLowerCase() });
  }

  async function getAdminByIdentifier(identifier) {
    const normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized.includes('@')) {
      return getAdminByEmail(normalized);
    }

    const byUsername = await adminUsers.findOne({ username: normalized });
    if (byUsername) {
      return byUsername;
    }

    return adminUsers.findOne({
      email: {
        $regex: `^${escapeRegex(normalized)}(?:@|$)`,
        $options: 'i'
      }
    });
  }

  async function getAdminById(id) {
    return adminUsers.findOne({ id: String(id || '').trim() });
  }

  async function writeLoginHistory(payload) {
    await adminLoginHistory.insertOne({
      id: makeId('alh'),
      ...payload,
      createdAt: new Date()
    });
  }

  async function writeAuditLog(payload) {
    await adminAuditLogs.insertOne({
      id: makeId('adt'),
      status: 'SUCCESS',
      reason: '',
      meta: {},
      ...payload,
      createdAt: new Date()
    });
  }

  async function writeApiLog(payload) {
    await adminApiLogs.insertOne({
      id: makeId('api'),
      ...payload,
      createdAt: new Date()
    });
  }

  async function createAdminSession(admin, loginMeta = {}) {
    const sessionId = makeId('as');
    const sessionTtlMinutes = Math.max(15, Number.parseInt(process.env.ADMIN_SESSION_TTL_MINUTES || '120', 10) || 120);
    const expiresAt = new Date(Date.now() + sessionTtlMinutes * 60 * 1000);

    const tokenPair = tokenService.createTokenPair({
      id: admin.id,
      role: 'ADMIN',
      adminRole: admin.role,
      email: admin.email,
      username: normalizeAdminUsername(admin.username, admin.email),
      scope: 'admin',
      sessionId
    });

    const refreshTokenHash = tokenService.hashRefreshToken(tokenPair.refreshToken);

    await adminSessionsV2.insertOne({
      id: sessionId,
      adminId: admin.id,
      refreshTokenHash,
      ip: String(loginMeta.ip || ''),
      userAgent: String(loginMeta.userAgent || ''),
      expiresAt,
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date()
    });

    await adminRefreshTokens.deleteMany({ adminId: admin.id });
    await adminRefreshTokens.insertOne({
      id: makeId('art'),
      adminId: admin.id,
      sessionId,
      tokenHash: refreshTokenHash,
      expiresAt: toDate(tokenPair.refreshTokenExpiresAt),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUsers.updateOne(
      { id: admin.id },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return {
      sessionId,
      tokenPair,
      expiresAt
    };
  }

  async function revokeAdminSessionById(sessionId) {
    const id = String(sessionId || '').trim();
    if (!id) {
      return;
    }

    const session = await adminSessionsV2.findOne({ id });
    if (!session) {
      return;
    }

    await adminSessionsV2.updateOne(
      { id },
      {
        $set: {
          revokedAt: new Date(),
          expiresAt: new Date()
        }
      }
    );

    await adminRefreshTokens.deleteMany({ sessionId: id });
  }

  async function verifyAdminAccessToken(accessToken) {
    const decoded = tokenService.verifyAccessToken(accessToken);
    if (String(decoded?.typ || '').trim().toLowerCase() !== 'access') {
      throw new Error('Invalid token type');
    }
    if (String(decoded?.role || '').trim().toUpperCase() !== 'ADMIN') {
      throw new Error('Invalid role');
    }
    if (String(decoded?.scope || '').trim().toLowerCase() !== 'admin') {
      throw new Error('Invalid scope');
    }

    const sessionId = String(decoded?.sessionId || '').trim();
    if (!sessionId) {
      throw new Error('Missing session');
    }

    const session = await adminSessionsV2.findOne({ id: sessionId });
    if (!session || session.revokedAt) {
      throw new Error('Session revoked');
    }

    const now = Date.now();
    if (new Date(session.expiresAt).getTime() <= now) {
      await revokeAdminSessionById(session.id);
      throw new Error('Session expired');
    }

    await adminSessionsV2.updateOne(
      { id: session.id },
      {
        $set: {
          lastSeenAt: new Date()
        }
      }
    );

    const admin = await getAdminById(session.adminId);
    if (!admin || String(admin.status || '').toUpperCase() !== 'ACTIVE') {
      throw new Error('Admin inactive');
    }

    return {
      admin,
      session,
      decoded
    };
  }

  async function rotateAdminRefreshToken(refreshToken) {
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    if (String(decoded?.role || '').trim().toUpperCase() !== 'ADMIN') {
      throw new Error('Invalid role');
    }
    if (String(decoded?.scope || '').trim().toLowerCase() !== 'admin') {
      throw new Error('Invalid scope');
    }

    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    const tokenRecord = await adminRefreshTokens.findOne({ tokenHash });
    if (!tokenRecord) {
      throw new Error('Refresh token not found');
    }

    if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
      await adminRefreshTokens.deleteOne({ tokenHash });
      throw new Error('Refresh token expired');
    }

    const admin = await getAdminById(tokenRecord.adminId);
    if (!admin || String(admin.status || '').toUpperCase() !== 'ACTIVE') {
      throw new Error('Admin inactive');
    }

    const tokenPair = tokenService.createTokenPair({
      id: admin.id,
      role: 'ADMIN',
      adminRole: admin.role,
      email: admin.email,
      username: normalizeAdminUsername(admin.username, admin.email),
      scope: 'admin',
      sessionId: tokenRecord.sessionId
    });

    const nextHash = tokenService.hashRefreshToken(tokenPair.refreshToken);

    await adminRefreshTokens.updateOne(
      { id: tokenRecord.id },
      {
        $set: {
          tokenHash: nextHash,
          expiresAt: toDate(tokenPair.refreshTokenExpiresAt),
          updatedAt: new Date()
        }
      }
    );

    await adminSessionsV2.updateOne(
      { id: tokenRecord.sessionId },
      {
        $set: {
          refreshTokenHash: nextHash,
          lastSeenAt: new Date()
        }
      }
    );

    return {
      admin,
      tokenPair
    };
  }

  async function revokeAdminRefreshToken(refreshToken) {
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    const record = await adminRefreshTokens.findOne({ tokenHash });
    if (!record) {
      return;
    }
    await revokeAdminSessionById(record.sessionId);
  }

  async function upsertUserProfile(userId, email, patch = {}) {
    const now = new Date();
    await adminUserProfiles.updateOne(
      { userId: String(userId || '').trim() },
      {
        $set: {
          userId: String(userId || '').trim(),
          email: String(email || '').trim().toLowerCase(),
          status: normalizeUserStatus(patch.status || 'ACTIVE'),
          flags: Array.isArray(patch.flags) ? patch.flags : [],
          updatedAt: now,
          freezeReason: String(patch.freezeReason || ''),
          banReason: String(patch.banReason || ''),
          kycStatus: String(patch.kycStatus || 'PENDING').trim().toUpperCase(),
          kycRemarks: String(patch.kycRemarks || '')
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  async function getUserProfile(userId) {
    return adminUserProfiles.findOne({ userId: String(userId || '').trim() });
  }

  async function listUsers(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const emailQuery = String(params.email || '').trim().toLowerCase();
    const userIdQuery = String(params.userId || params.uid || '').trim().toLowerCase();
    const statusQuery = String(params.status || '').trim().toUpperCase();
    const normalizedStatusFilter = USER_STATUSES.includes(statusQuery) ? statusQuery : '';

    const query = {};
    if (emailQuery) {
      query.email = { $regex: emailQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const requiresPostFilter = Boolean(userIdQuery || normalizedStatusFilter);
    const baseCursor = p2pCredentials
      .find(query, { projection: { email: 1, role: 1, updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1 });

    const credentials = requiresPostFilter
      ? await baseCursor.toArray()
      : await baseCursor.skip(skip).limit(limit).toArray();
    const totalBase = requiresPostFilter ? credentials.length : await p2pCredentials.countDocuments(query);
    const userIds = credentials.map((item) => makeP2PUserId(item.email));

    const [profiles, walletRows] = await Promise.all([
      adminUserProfiles.find({ userId: { $in: userIds } }).toArray(),
      wallets.find({ userId: { $in: userIds } }).toArray()
    ]);

    const profileMap = new Map(profiles.map((item) => [item.userId, item]));
    const walletMap = new Map(walletRows.map((item) => [item.userId, item]));

    let users = credentials.map((item) => {
      const userId = makeP2PUserId(item.email);
      const profile = profileMap.get(userId);
      const wallet = walletMap.get(userId);
      return {
        userId,
        email: item.email,
        role: String(item.role || 'USER').toUpperCase(),
        status: normalizeUserStatus(profile?.status || 'ACTIVE'),
        kycStatus: String(profile?.kycStatus || 'PENDING').toUpperCase(),
        balance: getAvailableBalance(wallet),
        lockedBalance: toNumber(wallet?.lockedBalance, 0),
        updatedAt: toDate(item.updatedAt || item.createdAt || Date.now()).toISOString()
      };
    });

    if (normalizedStatusFilter) {
      users = users.filter((user) => user.status === normalizedStatusFilter);
    }
    if (userIdQuery) {
      users = users.filter((user) => String(user.userId || '').toLowerCase().includes(userIdQuery));
    }

    const total = requiresPostFilter ? users.length : totalBase;
    if (requiresPostFilter) {
      users = users.slice(skip, skip + limit);
    }

    return {
      page,
      limit,
      total,
      users
    };
  }

  async function getUserById(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return null;
    }

    const profile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    const email = String(profile?.email || '').trim().toLowerCase();
    const credential = email ? await p2pCredentials.findOne({ email }) : null;
    const wallet = await wallets.findOne({ userId: normalizedUserId });
    const p2pOrderCount = await p2pOrders.countDocuments({ $or: [{ buyerUserId: normalizedUserId }, { sellerUserId: normalizedUserId }] });
    const tradeOrderCount = await tradeOrders.countDocuments({ userId: normalizedUserId });

    return {
      userId: normalizedUserId,
      email,
      status: normalizeUserStatus(profile?.status || 'ACTIVE'),
      kycStatus: String(profile?.kycStatus || 'PENDING').toUpperCase(),
      kycRemarks: String(profile?.kycRemarks || ''),
      role: String(credential?.role || 'USER').toUpperCase(),
      wallet: {
        balance: getAvailableBalance(wallet),
        lockedBalance: toNumber(wallet?.lockedBalance, 0)
      },
      stats: {
        p2pOrderCount,
        tradeOrderCount
      },
      flags: Array.isArray(profile?.flags) ? profile.flags : []
    };
  }

  async function updateUserStatus(userId, payload) {
    const normalizedUserId = String(userId || '').trim();
    const status = normalizeUserStatus(payload.status);
    const reason = String(payload.reason || '').trim();

    const existingProfile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    await upsertUserProfile(normalizedUserId, existingProfile?.email || payload.email || '', {
      status,
      freezeReason: status === 'FROZEN' ? reason : '',
      banReason: status === 'BANNED' ? reason : ''
    });

    return getUserById(normalizedUserId);
  }

  async function resetUserPassword(userId, newPassword) {
    const normalizedUserId = String(userId || '').trim();
    const profile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    if (!profile?.email) {
      throw new Error('User email not available for password reset');
    }

    await p2pCredentials.updateOne(
      { email: profile.email },
      {
        $set: {
          passwordHash: repos.hashPassword(String(newPassword || '')),
          updatedAt: new Date()
        }
      }
    );

    return { userId: normalizedUserId, email: profile.email };
  }

  async function adjustUserBalance(userId, amount, reason, coin = 'USDT') {
    const normalizedUserId = String(userId || '').trim();
    const normalizedAmount = Number(toNumber(amount, 0).toFixed(8));
    if (!normalizedAmount || !Number.isFinite(normalizedAmount)) {
      throw new Error('Invalid adjustment amount');
    }

    const profile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    await walletService.ensureWallet(normalizedUserId, {
      username: String(profile?.email || normalizedUserId).split('@')[0]
    });

    const updatedWallet = await walletService.adminAdjustBalance(
      normalizedUserId,
      normalizedAmount,
      String(reason || ''),
      {
        type: 'admin_adjustment',
        currency: String(coin || 'USDT').toUpperCase(),
        referenceId: makeId('adj'),
        metadata: {
          source: 'admin_store.adjust_user_balance'
        }
      }
    );

    await adminDeposits.insertOne({
      id: makeId('dep'),
      userId: normalizedUserId,
      coin: String(coin || 'USDT').toUpperCase(),
      amount: normalizedAmount,
      type: 'MANUAL_ADJUSTMENT',
      reason: String(reason || ''),
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return updatedWallet;
  }

  async function getUserKyc(userId) {
    const normalizedUserId = String(userId || '').trim();
    const profile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    const document = await adminKycDocuments.findOne({ userId: normalizedUserId });

    return {
      userId: normalizedUserId,
      kycStatus: String(profile?.kycStatus || 'PENDING').toUpperCase(),
      remarks: String(profile?.kycRemarks || ''),
      documents: Array.isArray(document?.documents) ? document.documents : []
    };
  }

  async function reviewKyc(userId, decision, remarks) {
    const normalizedUserId = String(userId || '').trim();
    const normalizedDecision = String(decision || '').trim().toUpperCase();
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(normalizedDecision)) {
      throw new Error('Invalid KYC decision');
    }

    const existingProfile = await adminUserProfiles.findOne({ userId: normalizedUserId });
    await upsertUserProfile(normalizedUserId, existingProfile?.email || '', {
      status: existingProfile?.status || 'ACTIVE',
      kycStatus: normalizedDecision,
      kycRemarks: String(remarks || '')
    });

    await adminKycDocuments.updateOne(
      { userId: normalizedUserId },
      {
        $set: {
          reviewDecision: normalizedDecision,
          reviewRemarks: String(remarks || ''),
          reviewedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: normalizedUserId,
          documents: [],
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return getUserKyc(normalizedUserId);
  }

  async function getWalletOverview() {
    const [walletAgg] = await wallets
      .aggregate([
        {
          $group: {
            _id: null,
            totalBalance: {
              $sum: {
                $ifNull: ['$availableBalance', '$balance']
              }
            },
            totalLockedBalance: { $sum: '$lockedBalance' },
            userCount: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const [withdrawalAgg] = await adminWithdrawals
      .aggregate([
        { $match: { status: 'PENDING' } },
        { $group: { _id: null, pendingAmount: { $sum: '$amount' }, pendingCount: { $sum: 1 } } }
      ])
      .toArray();

    return {
      totalBalance: toNumber(walletAgg?.totalBalance, 0),
      totalLockedBalance: toNumber(walletAgg?.totalLockedBalance, 0),
      totalWallets: Number(walletAgg?.userCount || 0),
      pendingWithdrawals: Number(withdrawalAgg?.pendingCount || 0),
      pendingWithdrawalAmount: toNumber(withdrawalAgg?.pendingAmount, 0)
    };
  }

  async function listDeposits(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const rows = await adminDeposits.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminDeposits.countDocuments({});
    return { page, limit, total, deposits: rows };
  }

  async function listWithdrawals(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const status = String(params.status || '').trim().toUpperCase();
    const query = {};
    if (status && WITHDRAWAL_STATUSES.includes(status)) {
      query.status = status;
    }

    const rows = await adminWithdrawals.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminWithdrawals.countDocuments(query);
    return { page, limit, total, withdrawals: rows };
  }

  async function reviewWithdrawal(withdrawalId, decision, reason, actor) {
    const normalizedDecision = normalizeWithdrawalStatus(decision);
    if (!['APPROVED', 'REJECTED'].includes(normalizedDecision)) {
      throw new Error('Decision must be APPROVED or REJECTED');
    }

    const now = new Date();
    const result = await adminWithdrawals.findOneAndUpdate(
      { id: String(withdrawalId || '').trim() },
      {
        $set: {
          status: normalizedDecision,
          reviewedBy: actor.id,
          reviewedByRole: actor.role,
          reviewReason: String(reason || ''),
          reviewedAt: now,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Withdrawal request not found');
    }

    return result.value;
  }

  async function setCoinWithdrawalConfig(coin, payload) {
    const normalizedCoin = String(coin || '').trim().toUpperCase();
    if (!normalizedCoin) {
      throw new Error('Coin is required');
    }

    const patch = {};
    if (payload.withdrawalsEnabled !== undefined) {
      patch.withdrawalsEnabled = Boolean(payload.withdrawalsEnabled);
    }
    if (payload.networkFee !== undefined) {
      patch.networkFee = toNumber(payload.networkFee, 0);
    }
    if (payload.minWithdrawal !== undefined) {
      patch.minWithdrawal = toNumber(payload.minWithdrawal, 0);
    }
    if (payload.maxWithdrawal !== undefined) {
      patch.maxWithdrawal = toNumber(payload.maxWithdrawal, 0);
    }

    await adminWalletConfig.updateOne(
      { coin: normalizedCoin },
      {
        $set: {
          ...patch,
          coin: normalizedCoin,
          updatedAt: new Date()
        },
        $setOnInsert: {
          withdrawalsEnabled: true,
          networkFee: 0,
          minWithdrawal: 0,
          maxWithdrawal: 0
        }
      },
      { upsert: true }
    );

    return adminWalletConfig.findOne({ coin: normalizedCoin });
  }

  async function listHotWalletBalances() {
    return adminHotWallets.find({}).sort({ coin: 1 }).toArray();
  }

  async function listSpotPairs() {
    return adminSpotPairs.find({}).sort({ symbol: 1 }).toArray();
  }

  async function updateSpotPair(symbol, patch = {}) {
    const normalizedSymbol = String(symbol || '').trim().toUpperCase();
    if (!normalizedSymbol) {
      throw new Error('Symbol is required');
    }

    const update = {
      updatedAt: new Date()
    };

    if (patch.enabled !== undefined) {
      update.enabled = Boolean(patch.enabled);
    }
    if (patch.makerFee !== undefined) {
      update.makerFee = toNumber(patch.makerFee, 0);
    }
    if (patch.takerFee !== undefined) {
      update.takerFee = toNumber(patch.takerFee, 0);
    }
    if (patch.pricePrecision !== undefined) {
      update.pricePrecision = Math.max(0, Number.parseInt(patch.pricePrecision, 10) || 0);
    }

    await adminSpotPairs.updateOne(
      { symbol: normalizedSymbol },
      {
        $set: {
          symbol: normalizedSymbol,
          ...update
        },
        $setOnInsert: {
          enabled: true,
          makerFee: 0.001,
          takerFee: 0.001,
          pricePrecision: 2
        }
      },
      { upsert: true }
    );

    return adminSpotPairs.findOne({ symbol: normalizedSymbol });
  }

  async function forceCancelSpotOrder(orderId, actor) {
    const now = Date.now();
    const result = await tradeOrders.findOneAndUpdate(
      { id: String(orderId || '').trim() },
      {
        $set: {
          status: 'CANCELLED_BY_ADMIN',
          cancelledBy: actor.id,
          cancelledAt: now,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Trade order not found');
    }

    return result.value;
  }

  async function listSpotTrades(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const symbol = String(params.symbol || '').trim().toUpperCase();
    const query = {};
    if (symbol) {
      query.symbol = symbol;
    }

    const rows = await tradeOrders.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await tradeOrders.countDocuments(query);
    return { page, limit, total, trades: rows };
  }

  async function getSpotOrderBook(symbol) {
    const normalizedSymbol = String(symbol || 'BTCUSDT').trim().toUpperCase();
    const latestTrades = await tradeOrders
      .find({ symbol: normalizedSymbol })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const basePrice = latestTrades[0]?.referencePrice || latestTrades[0]?.price || 50000;
    const asks = [];
    const bids = [];
    for (let i = 0; i < 12; i += 1) {
      asks.push({
        price: Number((basePrice + i * 1.5).toFixed(2)),
        quantity: Number((Math.random() * 2 + 0.1).toFixed(4)),
        side: 'ask'
      });
      bids.push({
        price: Number((basePrice - i * 1.5).toFixed(2)),
        quantity: Number((Math.random() * 2 + 0.1).toFixed(4)),
        side: 'bid'
      });
    }

    return {
      symbol: normalizedSymbol,
      source: latestTrades.length > 0 ? 'trade_orders' : 'synthetic',
      asks,
      bids,
      updatedAt: new Date().toISOString()
    };
  }

  async function listP2PAds(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const side = String(params.side || '').trim().toLowerCase();
    const query = {};
    if (['buy', 'sell'].includes(side)) {
      query.side = side;
    }

    const rows = await p2pOffers.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await p2pOffers.countDocuments(query);
    return { page, limit, total, ads: rows };
  }

  async function reviewP2PAd(offerId, decision, reason, actor) {
    const normalizedDecision = String(decision || '').trim().toUpperCase();
    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(normalizedDecision)) {
      throw new Error('Invalid ad decision');
    }

    const result = await p2pOffers.findOneAndUpdate(
      { id: String(offerId || '').trim() },
      {
        $set: {
          moderationStatus: normalizedDecision,
          moderationReason: String(reason || ''),
          moderatedBy: actor.id,
          moderatedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('P2P offer not found');
    }

    return result.value;
  }

  async function listP2PDisputes(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const rows = await p2pOrders
      .find({ status: 'DISPUTED' })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await p2pOrders.countDocuments({ status: 'DISPUTED' });
    return { page, limit, total, disputes: rows };
  }

  async function manualReleaseEscrow(orderId, actor) {
    const order = await p2pOrders.findOne({ id: String(orderId || '').trim() });
    if (!order) {
      throw new Error('Order not found');
    }

    const released = await walletService.releaseOrder(order.id, {
      userId: String(order.sellerUserId || ''),
      username: `admin:${actor.email}`
    });

    return released;
  }

  async function freezeEscrow(orderId, actor) {
    const order = await p2pOrders.findOne({ id: String(orderId || '').trim() });
    if (!order) {
      throw new Error('Order not found');
    }

    const now = Date.now();
    await p2pOrders.updateOne(
      { id: order.id },
      {
        $set: {
          status: 'DISPUTED',
          updatedAt: now,
          frozenByAdmin: actor.id,
          frozenAt: now
        },
        $push: {
          messages: {
            id: `msg_${now}_admin_freeze`,
            sender: `admin:${actor.email}`,
            text: 'Escrow frozen by admin for compliance review.',
            createdAt: now
          }
        }
      }
    );

    return p2pOrders.findOne({ id: order.id });
  }

  async function getP2PSettings() {
    const row = await adminP2PConfig.findOne({ key: 'global' });
    return row?.value || {
      p2pFeePercent: 0.1,
      minOrderLimit: 100,
      maxOrderLimit: 200000,
      autoExpiryMinutes: 15
    };
  }

  async function updateP2PSettings(payload = {}) {
    const current = await getP2PSettings();
    const next = {
      p2pFeePercent:
        payload.p2pFeePercent !== undefined ? toNumber(payload.p2pFeePercent, current.p2pFeePercent) : current.p2pFeePercent,
      minOrderLimit:
        payload.minOrderLimit !== undefined ? Math.max(0, Number.parseInt(payload.minOrderLimit, 10) || 0) : current.minOrderLimit,
      maxOrderLimit:
        payload.maxOrderLimit !== undefined ? Math.max(0, Number.parseInt(payload.maxOrderLimit, 10) || 0) : current.maxOrderLimit,
      autoExpiryMinutes:
        payload.autoExpiryMinutes !== undefined
          ? Math.max(1, Number.parseInt(payload.autoExpiryMinutes, 10) || 15)
          : current.autoExpiryMinutes
    };

    await adminP2PConfig.updateOne(
      { key: 'global' },
      {
        $set: {
          value: next,
          updatedAt: new Date()
        },
        $setOnInsert: {
          key: 'global'
        }
      },
      { upsert: true }
    );

    return next;
  }

  async function cleanupDemoP2PAds(actor = {}) {
    if (!walletService || typeof walletService.cleanupDemoAds !== 'function') {
      throw new Error('Wallet service cleanup action is not configured.');
    }

    const result = await walletService.cleanupDemoAds({
      id: actor.id,
      email: actor.email
    });

    return {
      cleanedCount: Number(result?.cleanedCount || 0),
      unlockedCount: Number(result?.unlockedCount || 0)
    };
  }

  async function getRevenueSummary() {
    const now = Date.now();
    const dayStart = new Date(now - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [platformSettingsRow, tradeRows, p2pRows, withdrawalRows] = await Promise.all([
      adminPlatformSettings.findOne({ key: 'global' }),
      tradeOrders
        .find({ createdAt: { $gte: monthStart } })
        .project({ amountUsdt: 1, createdAt: 1, status: 1 })
        .toArray(),
      p2pOrders
        .find({ updatedAt: { $gte: monthStart.getTime() } })
        .project({ amountInr: 1, status: 1, updatedAt: 1 })
        .toArray(),
      adminWithdrawals
        .find({ createdAt: { $gte: monthStart } })
        .project({ fee: 1, status: 1, createdAt: 1 })
        .toArray()
    ]);

    const globalFees = platformSettingsRow?.value?.globalTradingFees || { maker: 0.001, taker: 0.001 };
    const spotFeePercent = (toNumber(globalFees.maker, 0) + toNumber(globalFees.taker, 0)) / 2;
    const p2pFeePercent = toNumber((await getP2PSettings()).p2pFeePercent, 0) / 100;

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let spotRevenueMonth = 0;
    let p2pRevenueMonth = 0;
    let withdrawalRevenueMonth = 0;
    let tradingVolumeMonth = 0;

    const trendMap = new Map();

    for (const trade of tradeRows) {
      const amountUsdt = toNumber(trade.amountUsdt, 0);
      tradingVolumeMonth += amountUsdt;
      const fee = amountUsdt * spotFeePercent;
      spotRevenueMonth += fee;

      const createdAt = toDate(trade.createdAt);
      const ts = createdAt.getTime();
      if (ts >= dayStart.getTime()) {
        todayRevenue += fee;
      }
      if (ts >= weekStart.getTime()) {
        weekRevenue += fee;
      }
      if (ts >= monthStart.getTime()) {
        monthRevenue += fee;
      }

      const dayKey = createdAt.toISOString().slice(0, 10);
      trendMap.set(dayKey, toNumber(trendMap.get(dayKey), 0) + fee);
    }

    for (const order of p2pRows) {
      const amountInr = toNumber(order.amountInr, 0);
      const fee = amountInr * p2pFeePercent;
      p2pRevenueMonth += fee;

      const ts = toNumber(order.updatedAt, 0);
      if (ts >= dayStart.getTime()) {
        todayRevenue += fee;
      }
      if (ts >= weekStart.getTime()) {
        weekRevenue += fee;
      }
      if (ts >= monthStart.getTime()) {
        monthRevenue += fee;
      }

      const dayKey = toDate(ts || Date.now()).toISOString().slice(0, 10);
      trendMap.set(dayKey, toNumber(trendMap.get(dayKey), 0) + fee);
    }

    for (const withdrawal of withdrawalRows) {
      const fee = toNumber(withdrawal.fee, 0);
      withdrawalRevenueMonth += fee;
      const createdAt = toDate(withdrawal.createdAt);
      const ts = createdAt.getTime();
      if (ts >= dayStart.getTime()) {
        todayRevenue += fee;
      }
      if (ts >= weekStart.getTime()) {
        weekRevenue += fee;
      }
      if (ts >= monthStart.getTime()) {
        monthRevenue += fee;
      }

      const dayKey = createdAt.toISOString().slice(0, 10);
      trendMap.set(dayKey, toNumber(trendMap.get(dayKey), 0) + fee);
    }

    const trend = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }));

    const activeUsers = await p2pUserSessions.countDocuments({ expiresAt: { $gte: new Date() } });

    return {
      totalRevenue: {
        today: Number(todayRevenue.toFixed(2)),
        week: Number(weekRevenue.toFixed(2)),
        month: Number(monthRevenue.toFixed(2))
      },
      spotFeeEarnings: Number(spotRevenueMonth.toFixed(2)),
      p2pEarnings: Number(p2pRevenueMonth.toFixed(2)),
      withdrawalFeeEarnings: Number(withdrawalRevenueMonth.toFixed(2)),
      totalActiveUsers: activeUsers,
      totalTradingVolume: Number(tradingVolumeMonth.toFixed(2)),
      trend
    };
  }

  async function getPlatformSettings() {
    const current = await adminPlatformSettings.findOne({ key: 'global' });
    return current?.value || getDefaultPlatformSettings();
  }

  async function updatePlatformSettings(patch = {}, actorId = 'system') {
    const current = await getPlatformSettings();
    const next = {
      ...current,
      ...patch,
      features: {
        ...(current.features || {}),
        ...(patch.features || {})
      },
      globalTradingFees: {
        ...(current.globalTradingFees || {}),
        ...(patch.globalTradingFees || {})
      },
      compliance: {
        ...(current.compliance || {}),
        ...(patch.compliance || {})
      }
    };

    await adminPlatformSettings.updateOne(
      { key: 'global' },
      {
        $set: {
          key: 'global',
          value: next,
          updatedBy: actorId,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return next;
  }

  async function listComplianceFlags(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const rows = await adminComplianceFlags.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminComplianceFlags.countDocuments({});
    return { page, limit, total, flags: rows };
  }

  async function createComplianceFlag(payload, actor) {
    const record = {
      id: makeId('cmp'),
      userId: String(payload.userId || '').trim(),
      type: String(payload.type || 'SUSPICIOUS_ACTIVITY').trim().toUpperCase(),
      severity: String(payload.severity || 'MEDIUM').trim().toUpperCase(),
      reason: String(payload.reason || '').trim(),
      status: 'OPEN',
      createdBy: actor.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await adminComplianceFlags.insertOne(record);
    return record;
  }

  async function exportTransactionsCsv() {
    const [p2pTx, spotTx] = await Promise.all([
      p2pOrders
        .find({})
        .project({ id: 1, reference: 1, status: 1, amountInr: 1, assetAmount: 1, updatedAt: 1, buyerUserId: 1, sellerUserId: 1 })
        .sort({ updatedAt: -1 })
        .limit(2000)
        .toArray(),
      tradeOrders
        .find({})
        .project({ id: 1, symbol: 1, side: 1, amountUsdt: 1, estimatedQty: 1, status: 1, createdAt: 1, userId: 1 })
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray()
    ]);

    const rows = [
      ['source', 'id', 'reference', 'userId', 'counterparty', 'symbol', 'side', 'status', 'amount', 'qty', 'timestamp'].join(',')
    ];

    for (const row of p2pTx) {
      rows.push(
        [
          'p2p',
          row.id,
          row.reference,
          row.buyerUserId,
          row.sellerUserId,
          row.asset,
          row.side,
          row.status,
          row.amountInr,
          row.assetAmount,
          toDate(row.updatedAt).toISOString()
        ]
          .map((item) => `"${String(item ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
    }

    for (const row of spotTx) {
      rows.push(
        [
          'spot',
          row.id,
          '',
          row.userId,
          '',
          row.symbol,
          row.side,
          row.status,
          row.amountUsdt,
          row.estimatedQty,
          toDate(row.createdAt).toISOString()
        ]
          .map((item) => `"${String(item ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
    }

    return rows.join('\n');
  }

  async function listSupportTickets(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const status = String(params.status || '').trim().toUpperCase();
    const query = {};
    if (status) {
      query.status = status;
    }

    const rows = await adminSupportTickets.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminSupportTickets.countDocuments(query);

    return { page, limit, total, tickets: rows };
  }

  async function ensureDemoSupportTicket() {
    const count = await adminSupportTickets.countDocuments({});
    if (count > 0) {
      return;
    }

    await adminSupportTickets.insertOne({
      id: makeId('tkt'),
      userId: 'usr_demo_user',
      subject: 'Unable to release P2P order',
      status: 'OPEN',
      priority: 'HIGH',
      assignedTo: '',
      messages: [
        {
          id: makeId('tmsg'),
          sender: 'user',
          text: 'I marked payment done but seller did not release.',
          createdAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async function replySupportTicket(ticketId, message, actor) {
    const now = new Date();
    const msg = {
      id: makeId('tmsg'),
      sender: actor.email,
      senderRole: actor.role,
      text: String(message || '').trim(),
      createdAt: now
    };

    const result = await adminSupportTickets.findOneAndUpdate(
      { id: String(ticketId || '').trim() },
      {
        $push: {
          messages: msg
        },
        $set: {
          status: 'IN_PROGRESS',
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Ticket not found');
    }

    return result.value;
  }

  async function updateSupportTicketStatus(ticketId, status) {
    const normalized = String(status || '').trim().toUpperCase();
    if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(normalized)) {
      throw new Error('Invalid status');
    }

    const result = await adminSupportTickets.findOneAndUpdate(
      { id: String(ticketId || '').trim() },
      {
        $set: {
          status: normalized,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Ticket not found');
    }

    return result.value;
  }

  async function assignSupportTicket(ticketId, adminId) {
    const result = await adminSupportTickets.findOneAndUpdate(
      { id: String(ticketId || '').trim() },
      {
        $set: {
          assignedTo: String(adminId || '').trim(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Ticket not found');
    }

    return result.value;
  }

  async function getMonitoringOverview() {
    const now = new Date();
    const last10Min = new Date(Date.now() - 10 * 60 * 1000);

    const [activeUsers, activeAdmins, failedLogins, apiRequests, latestAudit] = await Promise.all([
      p2pUserSessions.countDocuments({ expiresAt: { $gte: now } }),
      adminSessionsV2.countDocuments({ expiresAt: { $gte: now }, revokedAt: null }),
      adminLoginHistory.countDocuments({ success: false, createdAt: { $gte: last10Min } }),
      adminApiLogs.countDocuments({ createdAt: { $gte: last10Min } }),
      adminAuditLogs.find({}).sort({ createdAt: -1 }).limit(10).toArray()
    ]);

    return {
      activeUsers,
      activeAdmins,
      failedLoginAttemptsLast10Min: failedLogins,
      apiRequestsLast10Min: apiRequests,
      dbConnected: Boolean(isDbConnected && isDbConnected()),
      recentAudit: latestAudit
    };
  }

  async function listApiLogs(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const rows = await adminApiLogs.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminApiLogs.countDocuments({});
    return { page, limit, total, logs: rows };
  }

  async function listAuditLogs(params = {}) {
    const { page, limit, skip } = parsePagination(params);
    const rows = await adminAuditLogs.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const total = await adminAuditLogs.countDocuments({});
    return { page, limit, total, logs: rows };
  }

  return {
    ADMIN_ROLES,
    USER_STATUSES,
    sanitizeAdmin,
    normalizeAdminRole,
    ensureIndexes,
    ensureDefaults,
    seedAdminUser,
    getAdminByEmail,
    getAdminByIdentifier,
    getAdminById,
    createAdminSession,
    verifyAdminAccessToken,
    rotateAdminRefreshToken,
    revokeAdminRefreshToken,
    revokeAdminSessionById,
    writeLoginHistory,
    writeAuditLog,
    writeApiLog,
    listUsers,
    getUserById,
    upsertUserProfile,
    updateUserStatus,
    resetUserPassword,
    adjustUserBalance,
    getUserKyc,
    reviewKyc,
    getWalletOverview,
    listDeposits,
    listWithdrawals,
    reviewWithdrawal,
    setCoinWithdrawalConfig,
    listHotWalletBalances,
    listSpotPairs,
    updateSpotPair,
    forceCancelSpotOrder,
    listSpotTrades,
    getSpotOrderBook,
    listP2PAds,
    reviewP2PAd,
    listP2PDisputes,
    manualReleaseEscrow,
    freezeEscrow,
    getP2PSettings,
    updateP2PSettings,
    cleanupDemoP2PAds,
    getRevenueSummary,
    getPlatformSettings,
    updatePlatformSettings,
    listComplianceFlags,
    createComplianceFlag,
    exportTransactionsCsv,
    listSupportTickets,
    ensureDemoSupportTicket,
    replySupportTicket,
    updateSupportTicketStatus,
    assignSupportTicket,
    getMonitoringOverview,
    listApiLogs,
    listAuditLogs,
    makeP2PUserId
  };
}

module.exports = {
  createAdminStore,
  ADMIN_ROLES,
  makeP2PUserId
};
