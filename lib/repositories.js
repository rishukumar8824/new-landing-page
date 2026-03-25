const crypto = require('crypto');
const fs = require('fs');
const { promisify } = require('util');
const { buildRefreshTokenRecord, toRefreshTokenResponse } = require('../models/RefreshToken');
const { toWithdrawalResponse } = require('../models/WithdrawalRequest');

const scryptAsync = promisify(crypto.scrypt);

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function toLeadResponse(doc) {
  return {
    id: doc.id,
    name: doc.name,
    mobile: doc.mobile,
    createdAt: toDate(doc.createdAt).toISOString(),
    verified: doc.verified,
    verificationMethod: doc.verificationMethod,
    source: doc.source
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

async function hashPasswordAsync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = await scryptAsync(password, salt, 64);
  return `${salt}:${Buffer.from(digest).toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || '').split(':');
  if (!salt || !digest) {
    return false;
  }

  const check = crypto.scryptSync(password, salt, 64);
  const digestBuffer = Buffer.from(digest, 'hex');
  if (digestBuffer.length !== check.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, check);
}

async function verifyPasswordAsync(password, storedHash) {
  const [salt, digest] = String(storedHash || '').split(':');
  if (!salt || !digest) {
    return false;
  }

  const check = Buffer.from(await scryptAsync(password, salt, 64));
  const digestBuffer = Buffer.from(digest, 'hex');
  if (digestBuffer.length !== check.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, check);
}

const KYC_STATUSES = ['NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'];

function normalizeKycStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (KYC_STATUSES.includes(normalized)) {
    return normalized;
  }
  return 'NOT_SUBMITTED';
}

function createRepositories(collections) {
  const {
    leads,
    adminSessions,
    refreshTokens,
    signupOtps,
    p2pCredentials,
    p2pKycRequests,
    p2pUserSessions,
    wallets,
    ledgerEntries,
    walletFailures,
    withdrawalRequests,
    auditLogs,
    p2pOffers,
    p2pOrders,
    tradeOrders,
    appMeta,
    counters
  } = collections;
  const SELLER_ACTIVE_ORDER_INDEX_NAME = 'uniq_p2p_orders_seller_active';
  const ACTIVE_FLOW_ORDER_INDEX_NAME = 'uniq_p2p_orders_active_flow';
  const IDEMPOTENT_ORDER_INDEX_NAME = 'uniq_p2p_orders_buyer_idempotency';
  const SIGNUP_OTP_COMPOSITE_INDEX_NAME = 'uniq_signup_otp_contact_purpose';
  const USER_ACTIVE_ORDER_STATUSES = ['CREATED', 'PENDING', 'PAID', 'PAYMENT_SENT', 'DISPUTED'];
  const USER_HISTORY_ORDER_STATUSES = ['COMPLETED', 'RELEASED', 'CANCELLED', 'EXPIRED'];

  function hasSameItems(a = [], b = []) {
    return a.length === b.length && a.every((item) => b.includes(item));
  }

  function escapeRegexPattern(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function ensureSellerActiveOrderIndex() {
    const indexes = await p2pOrders.indexes();

    for (const index of indexes) {
      if (!index || index.name === '_id_') {
        continue;
      }

      const key = index.key || {};
      const isSellerSingleKey = Object.keys(key).length === 1 && key.sellerUserId === 1;
      if (!isSellerSingleKey || index.unique !== true) {
        continue;
      }

      // Sellers can have multiple concurrent orders. Any unique seller-active index is legacy and
      // will hard-fail startup on real production data once a merchant has more than one active order.
      await p2pOrders.dropIndex(index.name);
    }
  }

  async function ensureActiveFlowOrderIndex() {
    const indexes = await p2pOrders.indexes();
    let hasDesiredIndex = false;

    for (const index of indexes) {
      if (!index || index.name === '_id_') {
        continue;
      }

      if (index.name !== ACTIVE_FLOW_ORDER_INDEX_NAME) {
        continue;
      }

      const key = index.key || {};
      const isFlowKeyIndex = Object.keys(key).length === 1 && key.flowKey === 1;
      const statuses = Array.isArray(index.partialFilterExpression?.status?.$in)
        ? index.partialFilterExpression.status.$in.map((value) => String(value).trim().toUpperCase())
        : [];
      const matches = isFlowKeyIndex && index.unique === true && hasSameItems(statuses, USER_ACTIVE_ORDER_STATUSES);

      if (matches) {
        hasDesiredIndex = true;
        continue;
      }

      await p2pOrders.dropIndex(index.name);
    }

    if (!hasDesiredIndex) {
      await p2pOrders.createIndex(
        { flowKey: 1 },
        {
          name: ACTIVE_FLOW_ORDER_INDEX_NAME,
          unique: true,
          partialFilterExpression: {
            flowKey: { $type: 'string' },
            status: { $in: USER_ACTIVE_ORDER_STATUSES }
          }
        }
      );
    }
  }

  async function ensureOrderIdempotencyIndex() {
    const indexes = await p2pOrders.indexes();
    let hasDesiredIndex = false;

    for (const index of indexes) {
      if (!index || index.name === '_id_') {
        continue;
      }

      if (index.name !== IDEMPOTENT_ORDER_INDEX_NAME) {
        continue;
      }

      const key = index.key || {};
      const isBuyerIdempotencyIndex =
        Object.keys(key).length === 2 && key.buyerUserId === 1 && key.idempotencyKey === 1;
      const typeFilter = String(index.partialFilterExpression?.idempotencyKey?.$type || '').trim().toLowerCase();
      const matches = isBuyerIdempotencyIndex && index.unique === true && typeFilter === 'string';

      if (matches) {
        hasDesiredIndex = true;
        continue;
      }

      await p2pOrders.dropIndex(index.name);
    }

    if (!hasDesiredIndex) {
      await p2pOrders.createIndex(
        { buyerUserId: 1, idempotencyKey: 1 },
        {
          name: IDEMPOTENT_ORDER_INDEX_NAME,
          unique: true,
          partialFilterExpression: {
            buyerUserId: { $type: 'string' },
            idempotencyKey: { $type: 'string' }
          }
        }
      );
    }
  }

  async function ensureSignupOtpIndexes() {
    const indexes = await signupOtps.indexes();
    let hasDesiredIndex = false;

    for (const index of indexes) {
      if (!index || index.name === '_id_') {
        continue;
      }

      const key = index.key || {};
      const keyFields = Object.keys(key);
      const isLegacyContactOnly = keyFields.length === 1 && key.contact === 1;
      const isCompositeContactPurpose = keyFields.length === 2 && key.contact === 1 && key.purpose === 1;

      if (isCompositeContactPurpose && index.unique === true) {
        hasDesiredIndex = true;
        continue;
      }

      if (isLegacyContactOnly && index.unique === true) {
        // Drop legacy unique index to allow separate OTP purposes for the same contact.
        await signupOtps.dropIndex(index.name);
      }
    }

    if (!hasDesiredIndex) {
      await signupOtps.createIndex(
        { contact: 1, purpose: 1 },
        { name: SIGNUP_OTP_COMPOSITE_INDEX_NAME, unique: true }
      );
    }

    await signupOtps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  async function ensureIndexes() {
    await ensureSellerActiveOrderIndex();
    await ensureActiveFlowOrderIndex();
    await ensureOrderIdempotencyIndex();
    await ensureSignupOtpIndexes();

    await Promise.all([
      leads.createIndex({ createdAt: -1 }),
      adminSessions.createIndex({ token: 1 }, { unique: true }),
      adminSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      refreshTokens.createIndex({ tokenHash: 1 }, { unique: true }),
      refreshTokens.createIndex({ userId: 1 }, { unique: true }),
      refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      p2pCredentials.createIndex({ email: 1 }, { unique: true }),
      p2pKycRequests.createIndex({ requestId: 1 }, { unique: true }),
      p2pKycRequests.createIndex({ userId: 1 }, { unique: true }),
      p2pKycRequests.createIndex({ updatedAt: -1 }),
      p2pUserSessions.createIndex({ token: 1 }, { unique: true }),
      p2pUserSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      wallets.createIndex({ userId: 1 }, { unique: true }),
      wallets.createIndex({ updatedAt: -1 }),
      wallets.createIndex({ availableBalance: 1 }),
      wallets.createIndex({ lockedBalance: 1 }),
      ledgerEntries.createIndex({ userId: 1, createdAt: -1 }),
      ledgerEntries.createIndex({ referenceId: 1 }),
      ledgerEntries.createIndex({ type: 1, createdAt: -1 }),
      walletFailures.createIndex({ userId: 1, createdAt: -1 }),
      withdrawalRequests.createIndex({ requestId: 1 }, { unique: true }),
      withdrawalRequests.createIndex({ userId: 1, status: 1, createdAt: -1 }),
      withdrawalRequests.createIndex(
        { userId: 1, currency: 1, address: 1, status: 1 },
        {
          unique: true,
          partialFilterExpression: { status: 'pending' }
        }
      ),
      auditLogs.createIndex({ userId: 1, createdAt: -1 }),
      auditLogs.createIndex({ action: 1, createdAt: -1 }),
      auditLogs.createIndex({ createdAt: -1 }),
      p2pOffers.createIndex({ id: 1 }, { unique: true }),
      p2pOffers.createIndex({ side: 1, asset: 1, price: 1 }),
      p2pOffers.createIndex({ status: 1, side: 1, asset: 1 }),
      p2pOffers.createIndex({ status: 1, side: 1, asset: 1, price: 1, updatedAt: -1 }),
      p2pOffers.createIndex({ merchantDepositLocked: 1, isDemo: 1, environment: 1 }),
      p2pOffers.createIndex({ createdByUserId: 1, updatedAt: -1 }),
      p2pOrders.createIndex({ id: 1 }, { unique: true }),
      p2pOrders.createIndex({ reference: 1 }, { unique: true }),
      p2pOrders.createIndex({ status: 1 }),
      p2pOrders.createIndex({ expiresAt: 1 }),
      p2pOrders.createIndex({ status: 1, updatedAt: -1 }),
      p2pOrders.createIndex({ buyerUserId: 1, status: 1, updatedAt: -1 }),
      p2pOrders.createIndex({ sellerUserId: 1, status: 1, updatedAt: -1 }),
      tradeOrders.createIndex({ createdAt: -1 }),
      appMeta.createIndex({ key: 1 }, { unique: true }),
      counters.createIndex({ key: 1 }, { unique: true })
    ]);
  }

  async function getMeta(key) {
    return appMeta.findOne({ key });
  }

  async function setMeta(key, value = {}) {
    await appMeta.updateOne(
      { key },
      {
        $set: {
          key,
          ...value,
          at: new Date()
        }
      },
      { upsert: true }
    );
  }

  async function migrateLegacyLeadsJsonOnce(jsonPath) {
    const metaKey = 'leads_migrated_v1';
    const existingMeta = await getMeta(metaKey);
    if (existingMeta?.done) {
      return { migrated: false, reason: 'already_migrated' };
    }

    if (!fs.existsSync(jsonPath)) {
      await setMeta(metaKey, { done: true, reason: 'legacy_file_missing' });
      return { migrated: false, reason: 'legacy_file_missing' };
    }

    let parsed = [];
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const json = JSON.parse(raw);
      if (Array.isArray(json)) {
        parsed = json;
      }
    } catch (error) {
      await setMeta(metaKey, { done: false, reason: 'parse_error', error: error.message });
      throw error;
    }

    if (!parsed.length) {
      await setMeta(metaKey, { done: true, reason: 'no_legacy_rows' });
      return { migrated: false, reason: 'no_legacy_rows' };
    }

    const ops = parsed.map((lead) => {
      const createdAt = toDate(lead.createdAt || Date.now());
      const uniqueKey = `${lead.id || '0'}_${createdAt.toISOString()}_${String(lead.mobile || '').toLowerCase()}`;
      const migrationDoc = {
        _legacyMigrationKey: uniqueKey,
        id: Number(lead.id || Date.now()),
        name: String(lead.name || 'Website Lead'),
        mobile: String(lead.mobile || ''),
        createdAt,
        source: lead.source ? String(lead.source) : 'legacy_import'
      };

      if (lead.verified !== undefined) {
        migrationDoc.verified = Boolean(lead.verified);
      }

      if (lead.verificationMethod) {
        migrationDoc.verificationMethod = String(lead.verificationMethod);
      }

      return {
        updateOne: {
          filter: { _legacyMigrationKey: uniqueKey },
          update: {
            $setOnInsert: migrationDoc
          },
          upsert: true
        }
      };
    });

    if (ops.length) {
      await leads.bulkWrite(ops, { ordered: false });
    }

    await setMeta(metaKey, { done: true, imported: ops.length });
    return { migrated: true, imported: ops.length };
  }

  async function saveLeadRecord(name, mobile, extra = {}) {
    const now = new Date();
    const doc = {
      id: Number(Date.now()),
      name: String(name || 'Website Lead'),
      mobile: String(mobile || ''),
      createdAt: now,
      ...extra
    };
    await leads.insertOne(doc);
    return toLeadResponse(doc);
  }

  async function getLeadsLatest() {
    const rows = await leads.find({}).sort({ createdAt: -1 }).toArray();
    return rows.map(toLeadResponse);
  }

  async function createAdminSession(token, expiresAtMs) {
    await adminSessions.updateOne(
      { token },
      {
        $set: {
          token,
          expiresAt: new Date(expiresAtMs)
        }
      },
      { upsert: true }
    );
  }

  async function getAdminSession(token) {
    return adminSessions.findOne({ token });
  }

  async function refreshAdminSession(token, expiresAtMs) {
    await adminSessions.updateOne(
      { token },
      { $set: { expiresAt: new Date(expiresAtMs) } }
    );
  }

  async function deleteAdminSession(token) {
    await adminSessions.deleteOne({ token });
  }

  async function saveRefreshToken(input) {
    const doc = buildRefreshTokenRecord(input);
    await refreshTokens.updateOne(
      { userId: doc.userId },
      {
        $set: doc
      },
      { upsert: true }
    );
    return toRefreshTokenResponse(doc);
  }

  async function getRefreshTokenByHash(tokenHash) {
    const row = await refreshTokens.findOne({ tokenHash: String(tokenHash || '').trim() });
    return toRefreshTokenResponse(row);
  }

  async function deleteRefreshTokenByHash(tokenHash) {
    await refreshTokens.deleteOne({ tokenHash: String(tokenHash || '').trim() });
  }

  async function deleteRefreshTokensByUserId(userId) {
    await refreshTokens.deleteMany({ userId: String(userId || '').trim() });
  }

  async function upsertSignupOtp(contact, otp, options = {}) {
    const purpose = String(options.purpose || 'signup').trim().toLowerCase() || 'signup';
    const payload =
      otp && typeof otp.payload === 'object' && otp.payload !== null
        ? otp.payload
        : {};
    await signupOtps.updateOne(
      { contact, purpose },
      {
        $set: {
          contact,
          purpose,
          code: otp.code,
          type: otp.type,
          attempts: Number(otp.attempts || 0),
          expiresAt: new Date(otp.expiresAt),
          payload
        }
      },
      { upsert: true }
    );
  }

  async function getSignupOtp(contact, options = {}) {
    const purpose = String(options.purpose || 'signup').trim().toLowerCase() || 'signup';
    return signupOtps.findOne({ contact, purpose });
  }

  async function deleteSignupOtp(contact, options = {}) {
    const purpose = String(options.purpose || 'signup').trim().toLowerCase() || 'signup';
    await signupOtps.deleteOne({ contact, purpose });
  }

  async function setP2PCredential(email, passwordHash, options = {}) {
    const now = new Date();
    const role = String(options.role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
    const hasMerchantFlag = options.isMerchant !== undefined;
    const hasMerchantDepositFlag = options.merchantDepositLocked !== undefined;
    const hasEmailVerifiedFlag = options.emailVerified !== undefined;
    const nextMerchantLevel = String(options.merchantLevel || '').trim().toLowerCase();

    const updateDoc = {
      email,
      passwordHash,
      role,
      updatedAt: now
    };

    if (hasMerchantFlag) {
      updateDoc.isMerchant = Boolean(options.isMerchant);
    }
    if (hasMerchantDepositFlag) {
      updateDoc.merchantDepositLocked = Boolean(options.merchantDepositLocked);
    }
    if (nextMerchantLevel) {
      updateDoc.merchantLevel = nextMerchantLevel;
    }
    if (hasEmailVerifiedFlag) {
      updateDoc.emailVerified = Boolean(options.emailVerified);
      updateDoc.emailVerifiedAt = Boolean(options.emailVerified) ? now : null;
    }

    await p2pCredentials.updateOne(
      { email },
      {
        $set: updateDoc,
        $setOnInsert: {
          createdAt: now,
          isMerchant: false,
          merchantDepositLocked: false,
          merchantLevel: 'trial',
          kycStatus: 'NOT_SUBMITTED',
          kycLevel: 'BASIC',
          kycUpdatedAt: null,
          kycVerifiedAt: null,
          kycRejectedAt: null,
          kycRejectionReason: '',
          kycAadhaarLast4: '',
          kycRequestId: '',
          emailVerified: false,
          emailVerifiedAt: null
        }
      },
      { upsert: true }
    );
  }

  async function getP2PCredential(email) {
    return p2pCredentials.findOne({ email });
  }

  async function updateP2PCredentialPassword(email, passwordHash) {
    await p2pCredentials.updateOne(
      { email },
      {
        $set: {
          passwordHash,
          updatedAt: new Date()
        }
      }
    );
  }

  async function touchP2PCredentialLogin(email, loginMeta = {}) {
    const updateDoc = {
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    if (loginMeta.ipAddress) {
      updateDoc.lastLoginIp = String(loginMeta.ipAddress).trim();
    }
    if (loginMeta.userAgent) {
      updateDoc.lastUserAgent = String(loginMeta.userAgent).trim();
    }
    if (loginMeta.deviceLabel) {
      updateDoc.lastLoginDevice = String(loginMeta.deviceLabel).trim();
    }

    await p2pCredentials.updateOne(
      { email },
      { $set: updateDoc }
    );
  }

  async function updateP2PCredentialKyc(email, payload = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const status = normalizeKycStatus(payload.status);
    const now = new Date();
    const patch = {
      updatedAt: now,
      kycStatus: status,
      kycUpdatedAt: now
    };

    if (payload.kycLevel !== undefined) {
      patch.kycLevel = String(payload.kycLevel || 'FULL').trim().toUpperCase() || 'FULL';
    }
    if (payload.requestId !== undefined) {
      patch.kycRequestId = String(payload.requestId || '').trim();
    }
    if (payload.aadhaarLast4 !== undefined) {
      patch.kycAadhaarLast4 = String(payload.aadhaarLast4 || '').trim().slice(-4);
    }
    if (payload.faceMatchScore !== undefined) {
      const numericScore = Number(payload.faceMatchScore);
      patch.kycFaceMatchScore = Number.isFinite(numericScore) ? Number(numericScore.toFixed(2)) : null;
    }
    if (payload.faceMatchProvider !== undefined) {
      patch.kycFaceMatchProvider = String(payload.faceMatchProvider || '').trim();
    }
    if (status === 'VERIFIED') {
      patch.kycVerifiedAt = now;
      patch.kycRejectedAt = null;
      patch.kycRejectionReason = '';
    } else if (status === 'REJECTED') {
      patch.kycRejectedAt = now;
      patch.kycVerifiedAt = null;
      patch.kycRejectionReason = String(payload.rejectionReason || 'AI face match failed').trim();
    } else {
      patch.kycVerifiedAt = null;
      patch.kycRejectedAt = null;
      patch.kycRejectionReason = String(payload.rejectionReason || '').trim();
    }

    await p2pCredentials.updateOne(
      { email: normalizedEmail },
      {
        $set: patch
      }
    );

    return getP2PCredential(normalizedEmail);
  }

  async function upsertP2PKycRequest(userId, email, payload = {}) {
    const normalizedUserId = String(userId || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const requestId = String(payload.requestId || '').trim();
    const now = new Date();
    const status = normalizeKycStatus(payload.status || 'PENDING_REVIEW');

    const doc = {
      requestId,
      userId: normalizedUserId,
      email: normalizedEmail,
      status,
      aadhaarMasked: String(payload.aadhaarMasked || '').trim(),
      aadhaarHash: String(payload.aadhaarHash || '').trim(),
      aadhaarFrontImage: String(payload.aadhaarFrontImage || '').trim(),
      selfieWithDocumentImage: String(payload.selfieWithDocumentImage || '').trim(),
      rejectionReason: String(payload.rejectionReason || '').trim(),
      faceMatch: payload.faceMatch && typeof payload.faceMatch === 'object' ? payload.faceMatch : {},
      createdAt: payload.createdAt ? toDate(payload.createdAt) : now,
      updatedAt: now
    };

    await p2pKycRequests.updateOne(
      { userId: normalizedUserId },
      {
        $set: doc,
        $setOnInsert: {
          requestId
        }
      },
      { upsert: true }
    );

    return p2pKycRequests.findOne({ userId: normalizedUserId });
  }

  async function getP2PKycRequestByUserId(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return null;
    }
    return p2pKycRequests.findOne({ userId: normalizedUserId });
  }

  async function createP2PUserSession(token, user, expiresAtMs) {
    await p2pUserSessions.updateOne(
      { token },
      {
        $set: {
          token,
          userId: user.id,
          username: user.username,
          email: user.email,
          role: String(user.role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
          expiresAt: new Date(expiresAtMs)
        }
      },
      { upsert: true }
    );
  }

  async function getP2PUserSession(token) {
    return p2pUserSessions.findOne({ token });
  }

  async function refreshP2PUserSession(token, expiresAtMs) {
    await p2pUserSessions.updateOne(
      { token },
      { $set: { expiresAt: new Date(expiresAtMs) } }
    );
  }

  async function deleteP2PUserSession(token) {
    await p2pUserSessions.deleteOne({ token });
  }

  async function ensureCounter(key, value) {
    await counters.updateOne(
      { key },
      { $setOnInsert: { key, value: Number(value || 0) } },
      { upsert: true }
    );
  }

  async function nextCounterValue(key) {
    const result = await counters.findOneAndUpdate(
      { key },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    return Number(result.value?.value || 1);
  }

  async function getOfferMaxNumericId() {
    const rows = await p2pOffers
      .find({ id: /^ofr_\d+$/ }, { projection: { id: 1 } })
      .toArray();

    if (!rows.length) {
      return 1000;
    }

    let maxId = 1000;
    for (const row of rows) {
      const parsed = Number.parseInt(String(row.id).replace('ofr_', ''), 10);
      if (Number.isFinite(parsed) && parsed > maxId) {
        maxId = parsed;
      }
    }

    return maxId;
  }

  async function ensureSeedOffers() {
    const existingCount = await p2pOffers.countDocuments({});
    if (existingCount > 0) {
      await p2pOffers.updateMany(
        {},
        [
          {
            $set: {
              status: {
                $let: {
                  vars: { normalizedStatus: { $toUpper: { $ifNull: ['$status', 'ACTIVE'] } } },
                  in: {
                    $cond: [{ $eq: ['$$normalizedStatus', 'ACTIVE'] }, 'ACTIVE', '$status']
                  }
                }
              },
              availableAmount: { $ifNull: ['$availableAmount', '$available'] },
              escrowLockedAmount: {
                $ifNull: ['$escrowLockedAmount', { $ifNull: ['$availableAmount', '$available'] }]
              },
              merchantDepositLocked: { $ifNull: ['$merchantDepositLocked', false] },
              isDemo: { $ifNull: ['$isDemo', false] },
              environment: { $ifNull: ['$environment', 'production'] },
              fundingSource: { $ifNull: ['$fundingSource', 'legacy'] },
              updatedAt: new Date()
            }
          }
        ]
      );
      const maxId = await getOfferMaxNumericId();
      await ensureCounter('p2p_offer_seq', maxId);
      return { seeded: false, count: existingCount };
    }

    await ensureCounter('p2p_offer_seq', 1000);
    return { seeded: false, count: 0 };
  }

  async function listOffers(filter = {}) {
    const query = {};
    const andConditions = [];
    if (filter.side) {
      query.side = filter.side;
    }
    if (filter.asset) {
      query.asset = filter.asset;
    }

    if (filter.activeOnly) {
      query.status = 'ACTIVE';
    }
    if (filter.createdByUserId) {
      query.createdByUserId = String(filter.createdByUserId).trim();
    }
    if (filter.merchantDepositLocked === true) {
      query.merchantDepositLocked = true;
    }
    if (filter.excludeDemo) {
      andConditions.push({ isDemo: { $ne: true } });
      andConditions.push({ environment: { $ne: 'demo' } });
    }
    if (filter.escrowBackedOnly) {
      query.fundingSource = 'ad_locked';
    }
    if (filter.merchantOwnedOnly) {
      andConditions.push({ createdByUserId: { $exists: true, $ne: '' } });
    }
    if (filter.availableOnly) {
      andConditions.push({
        $or: [{ availableAmount: { $gt: 0 } }, { available: { $gt: 0 } }]
      });
    }
    const amount = Number(filter.amount);
    if (Number.isFinite(amount) && amount > 0) {
      andConditions.push({ minLimit: { $lte: amount } });
      andConditions.push({ maxLimit: { $gte: amount } });
    }
    const payment = String(filter.payment || '').trim();
    if (payment) {
      query.payments = {
        $elemMatch: {
          $regex: escapeRegexPattern(payment),
          $options: 'i'
        }
      };
    }
    const advertiser = String(filter.advertiser || '').trim();
    if (advertiser) {
      query.advertiser = {
        $regex: escapeRegexPattern(advertiser),
        $options: 'i'
      };
    }
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const projection =
      filter.projection && typeof filter.projection === 'object'
        ? { ...filter.projection }
        : {
            _id: 0,
            id: 1,
            type: 1,
            side: 1,
            adType: 1,
            asset: 1,
            advertiser: 1,
            price: 1,
            availableAmount: 1,
            available: 1,
            minLimit: 1,
            maxLimit: 1,
            completionRate: 1,
            orders: 1,
            payments: 1,
            createdByUserId: 1,
            createdByUsername: 1,
            updatedAt: 1,
            createdAt: 1
          };

    const sort =
      filter.sort && typeof filter.sort === 'object'
        ? { ...filter.sort }
        : filter.activeOnly
          ? { price: filter.side === 'buy' ? 1 : -1, updatedAt: -1 }
          : { updatedAt: -1 };

    const limit = Math.max(0, Math.min(100, Number.parseInt(String(filter.limit || 0), 10) || 0));
    let cursor = p2pOffers.find(query, { projection }).sort(sort);
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const rows = await cursor.toArray();
    return rows.map((row) => {
      const mapped = { ...row };
      delete mapped._id;
      return mapped;
    });
  }

  async function getOfferById(offerId) {
    const row = await p2pOffers.findOne({ id: offerId });
    if (!row) {
      return null;
    }
    const mapped = { ...row };
    delete mapped._id;
    return mapped;
  }

  async function createOffer(offer) {
    const doc = {
      ...offer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await p2pOffers.insertOne(doc);
    const mapped = { ...doc };
    delete mapped._id;
    return mapped;
  }

  async function createTradeOrder(order) {
    const doc = {
      ...order,
      createdAt: toDate(order.createdAt || Date.now())
    };
    await tradeOrders.insertOne(doc);

    const overflowIds = await tradeOrders
      .find({}, { projection: { _id: 1 } })
      .sort({ createdAt: -1 })
      .skip(100)
      .toArray();

    if (overflowIds.length > 0) {
      await tradeOrders.deleteMany({
        _id: {
          $in: overflowIds.map((row) => row._id)
        }
      });
    }

    const mapped = { ...doc, createdAt: doc.createdAt.toISOString() };
    delete mapped._id;
    return mapped;
  }

  async function listTradeOrders(limit = 30) {
    const rows = await tradeOrders.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    return rows.map((row) => {
      const mapped = { ...row, createdAt: toDate(row.createdAt).toISOString() };
      delete mapped._id;
      return mapped;
    });
  }

  async function countTradeOrders() {
    return tradeOrders.countDocuments({});
  }

  async function createP2POrder(order) {
    await p2pOrders.insertOne(order);
    return order;
  }

  async function getP2POrderById(id) {
    const row = await p2pOrders.findOne({ id });
    if (!row) {
      return null;
    }
    delete row._id;
    return row;
  }

  async function getP2POrderByReference(reference) {
    const row = await p2pOrders.findOne({ reference });
    if (!row) {
      return null;
    }
    delete row._id;
    return row;
  }

  async function listP2PLiveOrders({ side, asset, limit = 20 } = {}) {
    const query = {
      status: { $in: ['CREATED', 'PENDING', 'PAID', 'PAYMENT_SENT', 'DISPUTED'] }
    };
    if (side) {
      query.side = side;
    }
    if (asset) {
      query.asset = asset;
    }

    const rows = await p2pOrders.find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
    return rows.map((row) => {
      const mapped = { ...row };
      delete mapped._id;
      return mapped;
    });
  }

  async function listP2POrdersForUser({
    userId,
    statuses = USER_ACTIVE_ORDER_STATUSES,
    side,
    asset,
    limit = 50
  } = {}) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return [];
    }

    const query = {
      $or: [{ buyerUserId: normalizedUserId }, { sellerUserId: normalizedUserId }]
    };

    if (Array.isArray(statuses) && statuses.length > 0) {
      query.status = {
        $in: statuses.map((status) => String(status || '').trim().toUpperCase()).filter(Boolean)
      };
    }
    if (side) {
      query.side = String(side || '').trim().toLowerCase();
    }
    if (asset) {
      query.asset = String(asset || '').trim().toUpperCase();
    }

    const rows = await p2pOrders
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Math.max(1, Number(limit) || 50))
      .toArray();

    return rows.map((row) => {
      const mapped = { ...row };
      delete mapped._id;
      return mapped;
    });
  }

  async function listP2PActiveOrdersForUser(options = {}) {
    return listP2POrdersForUser({
      ...options,
      statuses: USER_ACTIVE_ORDER_STATUSES
    });
  }

  async function listP2POrderHistoryForUser(options = {}) {
    return listP2POrdersForUser({
      ...options,
      statuses: USER_HISTORY_ORDER_STATUSES
    });
  }

  async function replaceP2POrderIfVersionMatches(id, expectedUpdatedAt, updatedOrder) {
    const result = await p2pOrders.replaceOne(
      { id, updatedAt: expectedUpdatedAt },
      updatedOrder
    );
    return result.modifiedCount === 1;
  }

  async function expireOpenOrders(nowMs = Date.now()) {
    await p2pOrders.updateMany(
      {
        status: { $in: ['OPEN', 'CREATED', 'PENDING'] },
        expiresAt: { $lte: nowMs }
      },
      {
        $set: {
          status: 'EXPIRED',
          updatedAt: nowMs
        }
      }
    );
  }

  async function createWithdrawalRequest(doc, { session = null } = {}) {
    const payload = {
      ...doc,
      createdAt: toDate(doc.createdAt || Date.now()),
      processedAt: doc.processedAt ? toDate(doc.processedAt) : null
    };
    await withdrawalRequests.insertOne(payload, session ? { session } : undefined);
    return toWithdrawalResponse(payload);
  }

  async function getWithdrawalRequestById(requestId, { session = null } = {}) {
    const row = await withdrawalRequests.findOne({ requestId: String(requestId || '').trim() }, session ? { session } : undefined);
    return toWithdrawalResponse(row);
  }

  async function getPendingWithdrawalByFingerprint({ userId, currency, address }, { session = null } = {}) {
    const row = await withdrawalRequests.findOne(
      {
        userId: String(userId || '').trim(),
        currency: String(currency || '').trim().toUpperCase(),
        address: String(address || '').trim(),
        status: 'pending'
      },
      session ? { session } : undefined
    );
    return toWithdrawalResponse(row);
  }

  async function listWithdrawalsByUser(userId, limit = 50) {
    const rows = await withdrawalRequests
      .find({ userId: String(userId || '').trim() })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
      .toArray();
    return rows.map((row) => toWithdrawalResponse(row));
  }

  async function updateWithdrawalStatus(requestId, status, metadata = {}, { session = null } = {}) {
    const now = new Date();
    const normalizedStatus = String(status || '').trim().toLowerCase();
    await withdrawalRequests.updateOne(
      { requestId: String(requestId || '').trim() },
      {
        $set: {
          status: normalizedStatus,
          processedAt: now,
          metadata: metadata && typeof metadata === 'object' ? metadata : {}
        }
      },
      session ? { session } : undefined
    );
    return getWithdrawalRequestById(requestId, { session });
  }

  async function writeAuditLog(entry) {
    await auditLogs.insertOne({
      userId: String(entry?.userId || '').trim(),
      action: String(entry?.action || 'unknown_action').trim().toLowerCase(),
      ipAddress: String(entry?.ipAddress || '').trim(),
      metadata: entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
      createdAt: toDate(entry?.createdAt || Date.now())
    });
  }

  return {
    ensureIndexes,
    migrateLegacyLeadsJsonOnce,
    saveLeadRecord,
    getLeadsLatest,
    createAdminSession,
    getAdminSession,
    refreshAdminSession,
    deleteAdminSession,
    saveRefreshToken,
    getRefreshTokenByHash,
    deleteRefreshTokenByHash,
    deleteRefreshTokensByUserId,
    upsertSignupOtp,
    getSignupOtp,
    deleteSignupOtp,
    setP2PCredential,
    getP2PCredential,
    updateP2PCredentialPassword,
    touchP2PCredentialLogin,
    updateP2PCredentialKyc,
    upsertP2PKycRequest,
    getP2PKycRequestByUserId,
    createP2PUserSession,
    getP2PUserSession,
    refreshP2PUserSession,
    deleteP2PUserSession,
    ensureCounter,
    nextCounterValue,
    ensureSeedOffers,
    listOffers,
    getOfferById,
    createOffer,
    createTradeOrder,
    listTradeOrders,
    countTradeOrders,
    createP2POrder,
    getP2POrderById,
    getP2POrderByReference,
    listP2PLiveOrders,
    listP2POrdersForUser,
    listP2PActiveOrdersForUser,
    listP2POrderHistoryForUser,
    replaceP2POrderIfVersionMatches,
    expireOpenOrders,
    createWithdrawalRequest,
    getWithdrawalRequestById,
    getPendingWithdrawalByFingerprint,
    listWithdrawalsByUser,
    updateWithdrawalStatus,
    writeAuditLog,
    hashPassword,
    hashPasswordAsync,
    verifyPassword,
    verifyPasswordAsync
  };
}

module.exports = {
  createRepositories
};
