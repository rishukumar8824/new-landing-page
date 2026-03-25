'use strict';

/**
 * Admin API Key Management Controller
 * - View user API keys
 * - Disable/revoke compromised keys
 * - API key usage analytics
 */

function createAdminApiKeysControllers({ adminStore, extendedStore }) {

  /**
   * GET /api/admin/apikeys
   * List all user API keys with filters.
   * Query: userId, status (ACTIVE|DISABLED|REVOKED), page, limit
   */
  async function listApiKeys(req, res) {
    const data = await extendedStore.listUserApiKeys(req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/apikeys/:userId
   * List API keys for a specific user.
   */
  async function getUserApiKeys(req, res) {
    const data = await extendedStore.getUserApiKeys(req.params.userId);
    return res.json(data);
  }

  /**
   * GET /api/admin/apikeys/key/:keyId
   * Get details for a specific API key (masked).
   */
  async function getApiKeyDetails(req, res) {
    const key = await extendedStore.getApiKeyById(req.params.keyId);
    if (!key) return res.status(404).json({ message: 'API key not found.' });
    return res.json({ apiKey: key });
  }

  /**
   * PATCH /api/admin/apikeys/key/:keyId/disable
   * Disable a compromised or suspicious API key.
   * Body: { reason: string }
   */
  async function disableApiKey(req, res) {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'reason is required.' });

    const key = await extendedStore.disableApiKey(req.params.keyId, {
      reason,
      disabledBy: req.adminAuth.adminId
    });

    if (!key) return res.status(404).json({ message: 'API key not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'apikeys',
      action: 'disable_api_key',
      entityType: 'api_key',
      entityId: req.params.keyId,
      status: 'SUCCESS',
      meta: { reason, userId: key.userId },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'API key disabled.', apiKey: key });
  }

  /**
   * PATCH /api/admin/apikeys/key/:keyId/revoke
   * Permanently revoke an API key.
   * Body: { reason: string }
   */
  async function revokeApiKey(req, res) {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'reason is required.' });

    const key = await extendedStore.revokeApiKey(req.params.keyId, {
      reason,
      revokedBy: req.adminAuth.adminId
    });

    if (!key) return res.status(404).json({ message: 'API key not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'apikeys',
      action: 'revoke_api_key',
      entityType: 'api_key',
      entityId: req.params.keyId,
      status: 'SUCCESS',
      meta: { reason, userId: key.userId },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'API key permanently revoked.', apiKey: key });
  }

  /**
   * POST /api/admin/apikeys/user/:userId/revoke-all
   * Revoke all API keys for a user (emergency).
   * Body: { reason: string }
   */
  async function revokeAllUserApiKeys(req, res) {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'reason is required.' });

    const result = await extendedStore.revokeAllUserApiKeys(req.params.userId, {
      reason,
      revokedBy: req.adminAuth.adminId
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'apikeys',
      action: 'revoke_all_user_api_keys',
      entityType: 'api_key',
      entityId: req.params.userId,
      status: 'SUCCESS',
      meta: { reason, revokedCount: result.revokedCount },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `${result.revokedCount} API keys revoked.`, ...result });
  }

  /**
   * GET /api/admin/apikeys/key/:keyId/usage
   * View API key usage logs.
   */
  async function getApiKeyUsage(req, res) {
    const data = await extendedStore.getApiKeyUsageLogs(req.params.keyId, req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/apikeys/stats
   * API key statistics overview.
   */
  async function getApiKeyStats(req, res) {
    const stats = await extendedStore.getApiKeyStats();
    return res.json(stats);
  }

  return {
    listApiKeys,
    getUserApiKeys,
    getApiKeyDetails,
    disableApiKey,
    revokeApiKey,
    revokeAllUserApiKeys,
    getApiKeyUsage,
    getApiKeyStats
  };
}

module.exports = { createAdminApiKeysControllers };
