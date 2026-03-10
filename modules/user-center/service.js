const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const DEFAULT_SUPPORT_TOOLS = [
  { key: 'reset_password', label: 'Reset password', path: '/security/change-password' },
  { key: 'identity_verification', label: 'Identity verification', path: '/user-center/identity' },
  { key: 'set_fund_code', label: 'Set fund code', path: '/security/set-fund-code' },
  { key: 'update_login_method', label: 'Update login method', path: '/security/change-email' }
];

const PROFILE_SECTIONS = [
  'Security',
  'Addresses',
  'Preferences',
  'Fees',
  'Gift',
  'Referral',
  'Socials',
  'Events',
  'Support',
  'Help',
  'About'
];

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function maskEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) {
    return '***';
  }
  const [name, domain] = normalized.split('@');
  const left = name.length <= 2 ? `${name[0] || '*'}*` : `${name.slice(0, 2)}***`;
  const right = domain.length <= 2 ? domain : `${domain.slice(0, 2)}***`;
  return `${left}@${right}`;
}

function normalizePassword(raw) {
  return String(raw || '').trim();
}

function normalizePhone(raw) {
  return String(raw || '').replace(/\s+/g, '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function buildAiReply(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('withdraw')) {
    return 'Withdrawal checks are in progress. Verify destination network, then share withdrawal ID for priority review.';
  }
  if (text.includes('deposit')) {
    return 'For deposit issues, share tx hash and network. We will validate confirmations and credit status.';
  }
  if (text.includes('kyc') || text.includes('verify')) {
    return 'KYC processing depends on clarity and profile match. Please ensure your ID details match account profile.';
  }
  if (text.includes('hack') || text.includes('unauthor') || text.includes('suspicious')) {
    return 'Security alert detected. We have flagged this ticket for human review and recommend changing password immediately.';
  }
  return 'We received your message. A support specialist will review this conversation shortly.';
}

function shouldEscalate(message) {
  const text = String(message || '').toLowerCase();
  return ['hack', 'stolen', 'unauthorized', 'urgent', 'fraud', 'locked', 'appeal'].some((word) => text.includes(word));
}

function createUserCenterService({ store, config = {} }) {
  const accountRecoveryDays = Number(config.accountRecoveryDays || 50);

  async function ensureUserContext(authUser) {
    if (!authUser) {
      throw createHttpError(401, 'Unauthorized', 'AUTH_REQUIRED');
    }

    const ensured = await store.upsertUserFromAuth({
      externalUserId: String(authUser.id || authUser.userId || '').trim(),
      email: String(authUser.email || '').trim().toLowerCase(),
      kycStatus: String(authUser.kycStatus || 'unverified').trim().toLowerCase(),
      vipLevel: String(authUser.vipLevel || 'Non-VIP').trim()
    });

    if (!ensured) {
      throw createHttpError(500, 'Unable to load user profile context.', 'USER_CONTEXT_ERROR');
    }
    return ensured;
  }

  function buildSecurityLevel(user, passwordSet) {
    let methods = 0;
    if (passwordSet) methods += 1;
    if (user.twofaEnabled) methods += 1;
    if (user.phone) methods += 1;

    if (methods >= 3) {
      return { level: 'High', methodsEnabled: methods };
    }
    if (methods >= 2) {
      return { level: 'Medium', methodsEnabled: methods };
    }
    return { level: 'Low', methodsEnabled: methods };
  }

  async function getUserCenterSummary(authUser) {
    const user = await ensureUserContext(authUser);
    const passwordHash = await store.getPasswordHash(user.id);
    const security = buildSecurityLevel(user, Boolean(passwordHash));

    return {
      profile: {
        id: user.id,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        nickname: user.nickname,
        avatar: user.avatar,
        uid: user.uid,
        vipLevel: user.vipLevel,
        verificationBadge: user.kycStatus === 'verified' ? 'Verified' : user.kycStatus === 'pending' ? 'Pending' : 'Unverified',
        kycStatus: user.kycStatus,
        createdAt: user.createdAt
      },
      security,
      sections: PROFILE_SECTIONS
    };
  }

  async function updateProfile(authUser, { nickname, avatar }) {
    const user = await ensureUserContext(authUser);
    return store.updateProfile(user.id, { nickname, avatar });
  }

  async function getIdentity(authUser) {
    const user = await ensureUserContext(authUser);
    return {
      country: user.country,
      name: user.fullName,
      idNumberMasked: user.idNumberMasked,
      kycStatus: user.kycStatus
    };
  }

  async function updateIdentity(authUser, payload = {}) {
    const user = await ensureUserContext(authUser);
    return store.updateIdentityInfo(user.id, {
      country: payload.country,
      fullName: payload.name,
      idNumberMasked: payload.idNumberMasked,
      kycStatus: payload.kycStatus || user.kycStatus || 'pending'
    });
  }

  async function changePassword(authUser, { currentPassword, newPassword }) {
    const user = await ensureUserContext(authUser);
    const nextPassword = normalizePassword(newPassword);
    if (nextPassword.length < 8) {
      throw createHttpError(400, 'New password must be at least 8 characters.', 'PASSWORD_WEAK');
    }

    const currentHash = await store.getPasswordHash(user.id);
    if (currentHash) {
      const ok = await bcrypt.compare(normalizePassword(currentPassword), currentHash);
      if (!ok) {
        throw createHttpError(400, 'Current password is incorrect.', 'PASSWORD_MISMATCH');
      }
    }

    const nextHash = await bcrypt.hash(nextPassword, 12);
    await store.changePassword(user.id, nextHash);
    return { success: true };
  }

  async function changePhone(authUser, { phone }) {
    const user = await ensureUserContext(authUser);
    const normalized = normalizePhone(phone);
    if (!/^\+?[0-9]{8,16}$/.test(normalized)) {
      throw createHttpError(400, 'Enter a valid phone number.', 'PHONE_INVALID');
    }
    await store.changePhone(user.id, normalized);
    return { success: true, phone: normalized };
  }

  async function changeEmail(authUser, { email }) {
    const user = await ensureUserContext(authUser);
    const normalized = String(email || '').trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      throw createHttpError(400, 'Enter a valid email address.', 'EMAIL_INVALID');
    }
    await store.changeEmail(user.id, normalized);
    return { success: true, email: normalized };
  }

  async function generateTwoFactor(authUser) {
    const user = await ensureUserContext(authUser);
    const secret = speakeasy.generateSecret({
      name: `Bitegit (${user.email})`,
      issuer: 'Bitegit',
      length: 20
    });

    await store.setTwoFactor(user.id, { secret: secret.base32, enabled: false });
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrDataUrl
    };
  }

  async function verifyAndEnableTwoFactor(authUser, { code }) {
    const user = await ensureUserContext(authUser);
    const twofa = await store.getTwoFactorSecret(user.id);
    if (!twofa.secret) {
      throw createHttpError(400, '2FA secret is not generated yet.', 'TWOFA_SECRET_MISSING');
    }

    const token = String(code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(token)) {
      throw createHttpError(400, 'Enter a valid 6-digit authenticator code.', 'TWOFA_CODE_INVALID');
    }

    const verified = speakeasy.totp.verify({
      secret: twofa.secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      throw createHttpError(400, 'Authenticator code is invalid.', 'TWOFA_VERIFY_FAILED');
    }

    await store.setTwoFactor(user.id, { secret: twofa.secret, enabled: true });
    return { success: true, enabled: true };
  }

  async function disableTwoFactor(authUser, { code }) {
    const user = await ensureUserContext(authUser);
    const twofa = await store.getTwoFactorSecret(user.id);
    if (!twofa.secret) {
      return { success: true, enabled: false };
    }

    const token = String(code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(token)) {
      throw createHttpError(400, 'Enter a valid 6-digit authenticator code.', 'TWOFA_CODE_INVALID');
    }

    const verified = speakeasy.totp.verify({
      secret: twofa.secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      throw createHttpError(400, 'Authenticator code is invalid.', 'TWOFA_VERIFY_FAILED');
    }

    await store.setTwoFactor(user.id, { secret: '', enabled: false });
    return { success: true, enabled: false };
  }

  async function setFundCode(authUser, { fundCode }) {
    const user = await ensureUserContext(authUser);
    const normalized = String(fundCode || '').trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw createHttpError(400, 'Fund code must be 6 digits.', 'FUND_CODE_INVALID');
    }

    const hash = await bcrypt.hash(normalized, 12);
    await store.setFundCodeHash(user.id, hash);
    return { success: true };
  }

  async function listLoginHistory(authUser) {
    const user = await ensureUserContext(authUser);
    return store.listLoginHistory(user.id, 50);
  }

  async function recordLoginEvent(authUser, { ip, device }) {
    const user = await ensureUserContext(authUser);
    await store.addLoginHistory(user.id, {
      ip: String(ip || 'unknown').trim(),
      device: String(device || 'unknown').trim()
    });
  }

  async function addAddress(authUser, payload) {
    const user = await ensureUserContext(authUser);
    return store.addWithdrawAddress(user.id, payload);
  }

  async function listAddresses(authUser) {
    const user = await ensureUserContext(authUser);
    return store.listWithdrawAddresses(user.id);
  }

  async function deleteAddress(authUser, addressId) {
    const user = await ensureUserContext(authUser);
    const deleted = await store.deleteWithdrawAddress(user.id, addressId);
    if (!deleted) {
      throw createHttpError(404, 'Address not found.', 'ADDRESS_NOT_FOUND');
    }
    return { success: true };
  }

  async function getPreferences(authUser) {
    const user = await ensureUserContext(authUser);
    return store.getPreferences(user.id);
  }

  async function updatePreferences(authUser, patch) {
    const user = await ensureUserContext(authUser);
    return store.updatePreferences(user.id, patch || {});
  }

  async function getFees() {
    return store.listFees();
  }

  async function createGift(authUser, payload) {
    const user = await ensureUserContext(authUser);
    return store.createGift(user.id, payload || {});
  }

  async function claimGift(authUser, payload) {
    const user = await ensureUserContext(authUser);
    return store.claimGift(user.id, payload?.giftCode);
  }

  async function listGifts(authUser) {
    const user = await ensureUserContext(authUser);
    return store.listGifts(user.id);
  }

  async function getReferralSummary(authUser) {
    const user = await ensureUserContext(authUser);
    return store.listReferrals(user.id);
  }

  async function getSupportCenterPayload() {
    const announcements = await store.listAnnouncements();
    return {
      announcements,
      tools: DEFAULT_SUPPORT_TOOLS
    };
  }

  async function createSupportTicket(authUser, payload = {}) {
    const user = await ensureUserContext(authUser);
    const subject = String(payload.subject || '').trim() || 'Support request';
    const category = String(payload.category || 'general').trim().toLowerCase();
    const message = String(payload.message || '').trim();
    const attachmentUrl = String(payload.attachmentUrl || '').trim();

    const ticketId = await store.createSupportTicket(user.id, {
      subject,
      category,
      message,
      attachmentUrl
    });

    if (message) {
      const aiMessage = buildAiReply(message);
      await store.addSupportMessage(user.id, ticketId, {
        senderType: 'ai',
        message: aiMessage,
        attachmentUrl: ''
      });

      if (shouldEscalate(message)) {
        await store.setSupportEscalation(ticketId, true);
        await store.addSupportMessage(user.id, ticketId, {
          senderType: 'agent',
          message: 'Your case has been escalated to a human support agent.',
          attachmentUrl: ''
        });
      }
    }

    return { ticketId };
  }

  async function listSupportTickets(authUser) {
    const user = await ensureUserContext(authUser);
    return store.listSupportTickets(user.id, 100);
  }

  async function sendSupportMessage(authUser, ticketId, payload = {}) {
    const user = await ensureUserContext(authUser);
    const message = String(payload.message || '').trim();
    if (!message) {
      throw createHttpError(400, 'Message is required.', 'SUPPORT_MESSAGE_REQUIRED');
    }

    await store.addSupportMessage(user.id, ticketId, {
      senderType: 'user',
      message,
      attachmentUrl: payload.attachmentUrl
    });

    const aiMessage = buildAiReply(message);
    await store.addSupportMessage(user.id, ticketId, {
      senderType: 'ai',
      message: aiMessage,
      attachmentUrl: ''
    });

    if (shouldEscalate(message)) {
      await store.setSupportEscalation(ticketId, true);
      await store.addSupportMessage(user.id, ticketId, {
        senderType: 'agent',
        message: 'Human support escalation is in progress. Please stay online.',
        attachmentUrl: ''
      });
    }

    return { success: true };
  }

  async function getSupportMessages(authUser, ticketId) {
    const user = await ensureUserContext(authUser);
    return store.listSupportMessages(user.id, ticketId, 500);
  }

  async function listHelpArticles(query = {}) {
    return store.listHelpArticles({ topic: query.topic || query.q, limit: 100 });
  }

  async function deleteAccount(authUser, payload = {}) {
    const user = await ensureUserContext(authUser);

    const confirmation = String(payload.confirmation || '').trim().toUpperCase();
    if (confirmation !== 'DELETE') {
      throw createHttpError(400, 'Type DELETE to confirm account deletion.', 'DELETE_CONFIRMATION_REQUIRED');
    }

    const recoveryUntil = new Date(Date.now() + accountRecoveryDays * 24 * 60 * 60 * 1000);
    await store.deleteAccount(user.id, recoveryUntil);

    return {
      success: true,
      status: 'deleted',
      recoveryUntil: recoveryUntil.toISOString(),
      note: `Account locked for ${accountRecoveryDays} days for recovery support.`
    };
  }

  return {
    ensureUserContext,
    getUserCenterSummary,
    updateProfile,
    getIdentity,
    updateIdentity,
    changePassword,
    changePhone,
    changeEmail,
    generateTwoFactor,
    verifyAndEnableTwoFactor,
    disableTwoFactor,
    setFundCode,
    listLoginHistory,
    recordLoginEvent,
    addAddress,
    listAddresses,
    deleteAddress,
    getPreferences,
    updatePreferences,
    getFees,
    createGift,
    claimGift,
    listGifts,
    getReferralSummary,
    getSupportCenterPayload,
    createSupportTicket,
    listSupportTickets,
    sendSupportMessage,
    getSupportMessages,
    listHelpArticles,
    deleteAccount
  };
}

module.exports = {
  createUserCenterService,
  createHttpError
};
