'use strict';

/**
 * Admin Feature Flags Controller
 * - Enable/disable trading pairs
 * - Enable/disable deposits/withdrawals per network
 * - Maintenance mode
 * - Kill switches
 */

function createAdminFeatureFlagsControllers({ adminStore, extendedStore }) {

  /**
   * GET /api/admin/features
   * List all feature flags and their current state.
   */
  async function listFeatureFlags(req, res) {
    const flags = await extendedStore.listFeatureFlags();
    return res.json({ flags });
  }

  /**
   * GET /api/admin/features/:flagKey
   * Get a specific feature flag.
   */
  async function getFeatureFlag(req, res) {
    const flag = await extendedStore.getFeatureFlag(req.params.flagKey);
    if (!flag) return res.status(404).json({ message: 'Feature flag not found.' });
    return res.json({ flag });
  }

  /**
   * PUT /api/admin/features/:flagKey
   * Enable or disable a feature flag.
   * Body: { enabled: true/false, reason?: string }
   */
  async function setFeatureFlag(req, res) {
    const enabled = req.body?.enabled === true || req.body?.enabled === 'true';
    const reason = String(req.body?.reason || '').trim();
    const flagKey = String(req.params.flagKey || '').trim();

    if (!flagKey) return res.status(400).json({ message: 'flagKey is required.' });

    const flag = await extendedStore.setFeatureFlag(flagKey, enabled, {
      updatedBy: req.adminAuth.adminId,
      reason
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'features',
      action: enabled ? 'enable_feature' : 'disable_feature',
      entityType: 'feature_flag',
      entityId: flagKey,
      status: 'SUCCESS',
      meta: { flagKey, enabled, reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `Feature '${flagKey}' ${enabled ? 'enabled' : 'disabled'}.`, flag });
  }

  /**
   * POST /api/admin/features/maintenance
   * Toggle maintenance mode.
   * Body: { enabled: true/false, message?: string, estimatedEndAt?: ISO date }
   */
  async function setMaintenanceMode(req, res) {
    const enabled = req.body?.enabled === true;
    const message = String(req.body?.message || 'System maintenance in progress.').trim();
    const estimatedEndAt = req.body?.estimatedEndAt ? new Date(req.body.estimatedEndAt) : null;

    await extendedStore.setFeatureFlag('MAINTENANCE_MODE', enabled, {
      updatedBy: req.adminAuth.adminId,
      reason: message
    });

    if (enabled) {
      await extendedStore.updateRiskConfig({
        maintenanceMode: true,
        maintenanceMessage: message,
        maintenanceEstimatedEnd: estimatedEndAt
      }, req.adminAuth.adminId);
    } else {
      await extendedStore.updateRiskConfig({
        maintenanceMode: false,
        maintenanceMessage: '',
        maintenanceEstimatedEnd: null
      }, req.adminAuth.adminId);
    }

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'features',
      action: enabled ? 'enable_maintenance' : 'disable_maintenance',
      entityType: 'feature_flag',
      entityId: 'MAINTENANCE_MODE',
      status: 'SUCCESS',
      meta: { enabled, message, estimatedEndAt },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}.`,
      maintenanceMode: enabled,
      maintenanceMessage: message
    });
  }

  /**
   * GET /api/admin/features/network-status
   * Get deposit/withdrawal status for all networks.
   */
  async function getNetworkStatus(req, res) {
    const statuses = await extendedStore.getNetworkStatuses();
    return res.json({ networks: statuses });
  }

  /**
   * PUT /api/admin/features/network/:network/deposit
   * Enable/disable deposits for a network (TRC20, ERC20, BEP20 etc.)
   * Body: { enabled: true/false, reason?: string }
   */
  async function setNetworkDeposit(req, res) {
    const network = String(req.params.network || '').trim().toUpperCase();
    const enabled = req.body?.enabled === true;
    const reason = String(req.body?.reason || '').trim();

    if (!network) return res.status(400).json({ message: 'network is required.' });

    const result = await extendedStore.setNetworkDepositStatus(network, enabled, {
      updatedBy: req.adminAuth.adminId,
      reason
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'features',
      action: enabled ? 'enable_network_deposit' : 'disable_network_deposit',
      entityType: 'network_config',
      entityId: network,
      status: 'SUCCESS',
      meta: { network, enabled, reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({
      message: `${network} deposits ${enabled ? 'enabled' : 'disabled'}.`,
      network: result
    });
  }

  /**
   * PUT /api/admin/features/network/:network/withdrawal
   * Enable/disable withdrawals for a network.
   * Body: { enabled: true/false, reason?: string }
   */
  async function setNetworkWithdrawal(req, res) {
    const network = String(req.params.network || '').trim().toUpperCase();
    const enabled = req.body?.enabled === true;
    const reason = String(req.body?.reason || '').trim();

    if (!network) return res.status(400).json({ message: 'network is required.' });

    const result = await extendedStore.setNetworkWithdrawalStatus(network, enabled, {
      updatedBy: req.adminAuth.adminId,
      reason
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'features',
      action: enabled ? 'enable_network_withdrawal' : 'disable_network_withdrawal',
      entityType: 'network_config',
      entityId: network,
      status: 'SUCCESS',
      meta: { network, enabled, reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({
      message: `${network} withdrawals ${enabled ? 'enabled' : 'disabled'}.`,
      network: result
    });
  }

  /**
   * PUT /api/admin/features/trading-pair/:symbol
   * Enable/disable a specific trading pair.
   * Body: { enabled: true/false, reason?: string }
   */
  async function setTradingPairStatus(req, res) {
    const symbol = String(req.params.symbol || '').trim().toUpperCase();
    const enabled = req.body?.enabled === true;
    const reason = String(req.body?.reason || '').trim();

    if (!symbol) return res.status(400).json({ message: 'symbol is required.' });

    const result = await extendedStore.setTradingPairEnabled(symbol, enabled, {
      updatedBy: req.adminAuth.adminId,
      reason
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'features',
      action: enabled ? 'enable_trading_pair' : 'disable_trading_pair',
      entityType: 'trading_pair',
      entityId: symbol,
      status: 'SUCCESS',
      meta: { symbol, enabled, reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({
      message: `${symbol} ${enabled ? 'enabled' : 'disabled'}.`,
      pair: result
    });
  }

  /**
   * GET /api/admin/features/audit
   * Feature flag change history.
   */
  async function getFeatureFlagHistory(req, res) {
    const data = await extendedStore.getFeatureFlagHistory(req.query);
    return res.json(data);
  }

  return {
    listFeatureFlags,
    getFeatureFlag,
    setFeatureFlag,
    setMaintenanceMode,
    getNetworkStatus,
    setNetworkDeposit,
    setNetworkWithdrawal,
    setTradingPairStatus,
    getFeatureFlagHistory
  };
}

module.exports = { createAdminFeatureFlagsControllers };
