'use strict';

/**
 * Admin 2FA (TOTP) Controller
 * Handles TOTP setup, verification, and management for admin users.
 */

const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const APP_NAME = process.env.APP_NAME || 'BitegitAdmin';

function createAdmin2FAControllers({ adminStore }) {
  /**
   * GET /api/admin/auth/2fa/status
   * Returns current 2FA status for logged-in admin.
   */
  async function get2FAStatus(req, res) {
    const admin = await adminStore.getAdminById(req.adminAuth.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    return res.json({
      enabled: !!admin.twoFactor?.enabled,
      provider: admin.twoFactor?.provider || null,
      lastVerifiedAt: admin.twoFactor?.lastVerifiedAt || null
    });
  }

  /**
   * POST /api/admin/auth/2fa/setup
   * Generates a TOTP secret and returns a QR code URL.
   * Admin must verify with a code before 2FA is activated.
   */
  async function setup2FA(req, res) {
    const admin = await adminStore.getAdminById(req.adminAuth.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    if (admin.twoFactor?.enabled) {
      return res.status(400).json({ message: '2FA is already enabled. Disable first to re-setup.' });
    }

    const secret = authenticator.generateSecret(32);
    const otpauth = authenticator.keyuri(
      String(admin.email || req.adminAuth.adminEmail),
      APP_NAME,
      secret
    );

    // Save pending secret (not yet enabled)
    await adminStore.savePending2FASecret(req.adminAuth.adminId, secret);

    let qrDataURL = '';
    try {
      qrDataURL = await QRCode.toDataURL(otpauth);
    } catch (_err) {
      qrDataURL = '';
    }

    return res.json({
      secret,
      otpauthUrl: otpauth,
      qrCode: qrDataURL,
      message: 'Scan the QR code or enter the secret in your authenticator app, then verify with /2fa/confirm.'
    });
  }

  /**
   * POST /api/admin/auth/2fa/confirm
   * Confirms and activates 2FA after verifying the TOTP code.
   * Body: { code: "123456" }
   */
  async function confirm2FA(req, res) {
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'A valid 6-digit TOTP code is required.' });
    }

    const admin = await adminStore.getAdminById(req.adminAuth.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    if (admin.twoFactor?.enabled) {
      return res.status(400).json({ message: '2FA is already enabled.' });
    }

    const pendingSecret = admin.twoFactor?.pendingSecret;
    if (!pendingSecret) {
      return res.status(400).json({ message: 'No pending 2FA setup found. Call /2fa/setup first.' });
    }

    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token: code, secret: pendingSecret });
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid TOTP code. Please check your authenticator app.' });
    }

    await adminStore.enable2FA(req.adminAuth.adminId, pendingSecret);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'auth',
      action: '2fa_enabled',
      entityType: 'admin_user',
      entityId: req.adminAuth.adminId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: '2FA successfully enabled.' });
  }

  /**
   * POST /api/admin/auth/2fa/verify
   * Used during login flow to verify TOTP code.
   * Body: { code: "123456", tempToken: "..." }
   */
  async function verify2FA(req, res) {
    const code = String(req.body?.code || '').trim();
    const tempToken = String(req.body?.tempToken || '').trim();

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'A valid 6-digit TOTP code is required.' });
    }

    // Verify the temp token issued after password check
    let pendingAdminId;
    try {
      const data = await adminStore.verifyTemp2FAToken(tempToken);
      pendingAdminId = data.adminId;
    } catch (_err) {
      return res.status(401).json({ message: 'Invalid or expired 2FA session. Please login again.' });
    }

    const admin = await adminStore.getAdminById(pendingAdminId);
    if (!admin || !admin.twoFactor?.enabled || !admin.twoFactor?.secret) {
      return res.status(400).json({ message: '2FA is not configured for this account.' });
    }

    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token: code, secret: admin.twoFactor.secret });
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid TOTP code.' });
    }

    // Complete login - issue full tokens
    const tokenPair = await adminStore.completeLogin2FA(admin, req);
    return res.json({
      message: '2FA verified. Login successful.',
      ...tokenPair
    });
  }

  /**
   * POST /api/admin/auth/2fa/disable
   * Disables 2FA. Requires current TOTP code for confirmation.
   * Body: { code: "123456" }
   */
  async function disable2FA(req, res) {
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Current TOTP code is required to disable 2FA.' });
    }

    const admin = await adminStore.getAdminById(req.adminAuth.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    if (!admin.twoFactor?.enabled) {
      return res.status(400).json({ message: '2FA is not enabled.' });
    }

    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token: code, secret: admin.twoFactor.secret });
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid TOTP code. 2FA not disabled.' });
    }

    await adminStore.disable2FA(req.adminAuth.adminId);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'auth',
      action: '2fa_disabled',
      entityType: 'admin_user',
      entityId: req.adminAuth.adminId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: '2FA has been disabled.' });
  }

  /**
   * POST /api/admin/auth/2fa/admin-reset/:adminId
   * SUPER_ADMIN only: Force-reset 2FA for another admin.
   */
  async function adminReset2FA(req, res) {
    const targetId = String(req.params.adminId || '').trim();
    if (!targetId) return res.status(400).json({ message: 'adminId is required.' });

    const target = await adminStore.getAdminById(targetId);
    if (!target) return res.status(404).json({ message: 'Admin not found.' });

    await adminStore.disable2FA(targetId);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'auth',
      action: '2fa_admin_reset',
      entityType: 'admin_user',
      entityId: targetId,
      status: 'SUCCESS',
      meta: { targetEmail: target.email },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `2FA reset for admin ${target.email}.` });
  }

  return {
    get2FAStatus,
    setup2FA,
    confirm2FA,
    verify2FA,
    disable2FA,
    adminReset2FA
  };
}

module.exports = { createAdmin2FAControllers };
