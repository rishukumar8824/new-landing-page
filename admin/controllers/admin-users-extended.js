'use strict';

/**
 * Admin Users Extended Controller
 * - Admin user management (SUPER_ADMIN)
 * - User login history
 * - Futures positions
 * - Ledger view
 * - User activity & devices
 */

const bcryptjs = require('bcryptjs');

function createAdminUsersExtendedControllers({ adminStore, extendedStore }) {

  // ─── Admin User Management ────────────────────────────────────────────────

  /**
   * GET /api/admin/admins
   * List all admin accounts.
   */
  async function listAdmins(req, res) {
    const data = await extendedStore.listAdminUsers(req.query);
    return res.json(data);
  }

  /**
   * POST /api/admin/admins
   * Create a new admin account.
   * Body: { email, password, role, username? }
   */
  async function createAdmin(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const role = String(req.body?.role || 'SUPPORT_ADMIN').trim().toUpperCase();
    const username = String(req.body?.username || '').trim().toLowerCase() || email.split('@')[0];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const validRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const passwordHash = await bcryptjs.hash(password, 12);
    const newAdmin = await extendedStore.createAdminUser({ email, username, passwordHash, role });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'admin_users',
      action: 'create_admin',
      entityType: 'admin_user',
      entityId: newAdmin.id,
      status: 'SUCCESS',
      meta: { email, role },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.status(201).json({ message: 'Admin created.', admin: newAdmin });
  }

  /**
   * GET /api/admin/admins/:adminId
   * Get admin account details.
   */
  async function getAdmin(req, res) {
    const admin = await adminStore.getAdminById(req.params.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    // Sanitize sensitive fields
    const { passwordHash, twoFactor, ...safe } = admin;
    return res.json({ admin: { ...safe, has2FA: !!admin.twoFactor?.enabled } });
  }

  /**
   * PATCH /api/admin/admins/:adminId/status
   * Enable/disable admin account.
   * Body: { status: "ACTIVE" | "DISABLED" }
   */
  async function setAdminStatus(req, res) {
    const status = String(req.body?.status || '').trim().toUpperCase();
    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({ message: 'status must be ACTIVE or DISABLED.' });
    }
    if (req.params.adminId === req.adminAuth.adminId) {
      return res.status(400).json({ message: 'You cannot change your own account status.' });
    }

    const updated = await extendedStore.updateAdminStatus(req.params.adminId, status);
    if (!updated) return res.status(404).json({ message: 'Admin not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'admin_users',
      action: 'set_admin_status',
      entityType: 'admin_user',
      entityId: req.params.adminId,
      status: 'SUCCESS',
      meta: { newStatus: status },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `Admin status set to ${status}.`, admin: updated });
  }

  /**
   * PATCH /api/admin/admins/:adminId/role
   * Update admin role. SUPER_ADMIN only.
   * Body: { role: "FINANCE_ADMIN" }
   */
  async function updateAdminRole(req, res) {
    const role = String(req.body?.role || '').trim().toUpperCase();
    const validRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }
    if (req.params.adminId === req.adminAuth.adminId) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const updated = await extendedStore.updateAdminRole(req.params.adminId, role);
    if (!updated) return res.status(404).json({ message: 'Admin not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'admin_users',
      action: 'update_admin_role',
      entityType: 'admin_user',
      entityId: req.params.adminId,
      status: 'SUCCESS',
      meta: { newRole: role },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `Admin role updated to ${role}.`, admin: updated });
  }

  /**
   * PATCH /api/admin/admins/:adminId/ip-whitelist
   * Update IP whitelist for admin.
   * Body: { ips: ["1.2.3.4", "5.6.7.8"] }
   */
  async function updateAdminIpWhitelist(req, res) {
    const ips = Array.isArray(req.body?.ips) ? req.body.ips.map(ip => String(ip).trim()).filter(Boolean) : [];
    const updated = await extendedStore.updateAdminIpWhitelist(req.params.adminId, ips);
    if (!updated) return res.status(404).json({ message: 'Admin not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'admin_users',
      action: 'update_ip_whitelist',
      entityType: 'admin_user',
      entityId: req.params.adminId,
      status: 'SUCCESS',
      meta: { ips },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'IP whitelist updated.', admin: updated });
  }

  /**
   * DELETE /api/admin/admins/:adminId
   * Remove admin account. Cannot delete yourself.
   */
  async function deleteAdmin(req, res) {
    if (req.params.adminId === req.adminAuth.adminId) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const deleted = await extendedStore.deleteAdminUser(req.params.adminId);
    if (!deleted) return res.status(404).json({ message: 'Admin not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'admin_users',
      action: 'delete_admin',
      entityType: 'admin_user',
      entityId: req.params.adminId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Admin account deleted.' });
  }

  // ─── User Login History ───────────────────────────────────────────────────

  /**
   * GET /api/admin/users/:userId/login-history
   * View login history + IP logs for a user.
   */
  async function getUserLoginHistory(req, res) {
    const data = await extendedStore.getUserLoginHistory(req.params.userId, req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/users/:userId/devices
   * View registered devices for a user.
   */
  async function getUserDevices(req, res) {
    const data = await extendedStore.getUserDevices(req.params.userId);
    return res.json(data);
  }

  /**
   * POST /api/admin/users/:userId/force-logout
   * Force logout user from all sessions.
   */
  async function forceLogoutUser(req, res) {
    await extendedStore.revokeAllUserSessions(req.params.userId);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'users',
      action: 'force_logout_user',
      entityType: 'user',
      entityId: req.params.userId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'User sessions revoked. User forced to logout.' });
  }

  // ─── Ledger ───────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/ledger
   * Full financial ledger with filters.
   * Query: userId, type (deposit|withdrawal|trade|fee|adjustment), coin, from, to, page, limit
   */
  async function getLedger(req, res) {
    const data = await extendedStore.getLedger(req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/ledger/export.csv
   * Export ledger as CSV.
   */
  async function exportLedger(req, res) {
    const csv = await extendedStore.exportLedgerCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger-export.csv"');
    return res.status(200).send(csv);
  }

  // ─── Futures Positions ────────────────────────────────────────────────────

  /**
   * GET /api/admin/futures/positions
   * View all open futures positions.
   */
  async function listFuturesPositions(req, res) {
    const data = await extendedStore.listFuturesPositions(req.query);
    return res.json(data);
  }

  /**
   * POST /api/admin/futures/positions/:positionId/force-close
   * Force close a futures position.
   * Body: { reason: "Risk management" }
   */
  async function forceClosePosition(req, res) {
    const reason = String(req.body?.reason || 'Force closed by admin').trim();
    const data = await extendedStore.forceClosePosition(req.params.positionId, {
      adminId: req.adminAuth.adminId,
      reason
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'futures',
      action: 'force_close_position',
      entityType: 'futures_position',
      entityId: req.params.positionId,
      status: 'SUCCESS',
      meta: { reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Position force closed.', position: data });
  }

  /**
   * GET /api/admin/futures/liquidations
   * View recent liquidation events.
   */
  async function listLiquidations(req, res) {
    const data = await extendedStore.listLiquidationEvents(req.query);
    return res.json(data);
  }

  return {
    // Admin management
    listAdmins,
    createAdmin,
    getAdmin,
    setAdminStatus,
    updateAdminRole,
    updateAdminIpWhitelist,
    deleteAdmin,
    // User extended
    getUserLoginHistory,
    getUserDevices,
    forceLogoutUser,
    // Ledger
    getLedger,
    exportLedger,
    // Futures
    listFuturesPositions,
    forceClosePosition,
    listLiquidations
  };
}

module.exports = { createAdminUsersExtendedControllers };
