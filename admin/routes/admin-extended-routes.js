'use strict';

/**
 * Admin Extended Routes
 * Registers all production-grade admin panel routes:
 * - 2FA management
 * - Admin user management
 * - Notifications
 * - Risk management
 * - Feature flags
 * - Blockchain monitoring
 * - API key management
 * - Ledger
 * - Futures
 * - User extended (login history, devices)
 */

const { createAdmin2FAControllers } = require('../controllers/admin-2fa');
const { createAdminUsersExtendedControllers } = require('../controllers/admin-users-extended');
const { createAdminNotificationsControllers } = require('../controllers/admin-notifications');
const { createAdminRiskControllers } = require('../controllers/admin-risk');
const { createAdminFeatureFlagsControllers } = require('../controllers/admin-feature-flags');
const { createAdminBlockchainControllers } = require('../controllers/admin-blockchain');
const { createAdminApiKeysControllers } = require('../controllers/admin-apikeys');

const ROLE_GROUPS = {
  ALL: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'],
  SUPER: ['SUPER_ADMIN'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_ADMIN'],
  SUPPORT: ['SUPER_ADMIN', 'SUPPORT_ADMIN'],
  COMPLIANCE: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  OPS: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN']
};

function registerAdminExtendedRoutes(app, deps) {
  const { adminStore, extendedStore, adminAuthMiddleware } = deps;

  const express = require('express');
  const router = express.Router();

  // ─── Security headers ──────────────────────────────────────────────────
  router.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // ─── Init controllers ──────────────────────────────────────────────────
  const ctrl2FA = createAdmin2FAControllers({ adminStore, extendedStore });
  const ctrlUsers = createAdminUsersExtendedControllers({ adminStore, extendedStore });
  const ctrlNotif = createAdminNotificationsControllers({ adminStore, extendedStore });
  const ctrlRisk = createAdminRiskControllers({ adminStore, extendedStore });
  const ctrlFeatures = createAdminFeatureFlagsControllers({ adminStore, extendedStore });
  const ctrlBlockchain = createAdminBlockchainControllers({ adminStore, extendedStore });
  const ctrlApiKeys = createAdminApiKeysControllers({ adminStore, extendedStore });

  function protect(roles = ROLE_GROUPS.ALL) {
    return adminAuthMiddleware.requireAdmin(roles);
  }

  function wrap(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (err) {
        if (!res.headersSent) {
          const status = Number(err?.status || 500);
          res.status(status).json({ message: status >= 500 ? 'Admin server error.' : (err.message || 'Error') });
        }
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2FA Management
  // ─────────────────────────────────────────────────────────────────────
  router.get('/auth/2fa/status',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrl2FA.get2FAStatus));

  router.post('/auth/2fa/setup',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrl2FA.setup2FA));

  router.post('/auth/2fa/confirm',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrl2FA.confirm2FA));

  router.post('/auth/2fa/verify',
    wrap(ctrl2FA.verify2FA));  // No auth needed - part of login flow

  router.post('/auth/2fa/disable',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrl2FA.disable2FA));

  router.post('/auth/2fa/admin-reset/:adminId',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrl2FA.adminReset2FA));

  // ─────────────────────────────────────────────────────────────────────
  // Admin User Management (SUPER_ADMIN only)
  // ─────────────────────────────────────────────────────────────────────
  router.get('/admins',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.listAdmins));

  router.post('/admins',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.createAdmin));

  router.get('/admins/:adminId',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.getAdmin));

  router.patch('/admins/:adminId/status',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.setAdminStatus));

  router.patch('/admins/:adminId/role',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.updateAdminRole));

  router.patch('/admins/:adminId/ip-whitelist',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.updateAdminIpWhitelist));

  router.delete('/admins/:adminId',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlUsers.deleteAdmin));

  // ─────────────────────────────────────────────────────────────────────
  // User Extended (login history, devices, force logout)
  // ─────────────────────────────────────────────────────────────────────
  router.get('/users/:userId/login-history',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.getUserLoginHistory));

  router.get('/users/:userId/devices',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.getUserDevices));

  router.post('/users/:userId/force-logout',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.forceLogoutUser));

  // ─────────────────────────────────────────────────────────────────────
  // Ledger
  // ─────────────────────────────────────────────────────────────────────
  router.get('/ledger',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlUsers.getLedger));

  router.get('/ledger/export.csv',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlUsers.exportLedger));

  // ─────────────────────────────────────────────────────────────────────
  // Futures Positions
  // ─────────────────────────────────────────────────────────────────────
  router.get('/futures/positions',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.listFuturesPositions));

  router.post('/futures/positions/:positionId/force-close',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.forceClosePosition));

  router.get('/futures/liquidations',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlUsers.listLiquidations));

  // ─────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────
  router.get('/notifications/stats',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrlNotif.getNotificationStats));

  router.get('/notifications',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrlNotif.listNotifications));

  router.post('/notifications',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlNotif.createNotification));

  router.post('/notifications/broadcast',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlNotif.broadcastNotification));

  router.get('/notifications/:notificationId',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrlNotif.getNotification));

  router.patch('/notifications/:notificationId/status',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlNotif.updateNotificationStatus));

  router.delete('/notifications/:notificationId',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlNotif.deleteNotification));

  // ─────────────────────────────────────────────────────────────────────
  // Risk Management
  // ─────────────────────────────────────────────────────────────────────
  router.get('/risk/summary',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlRisk.getRiskSummary));

  router.get('/risk/config',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlRisk.getRiskConfig));

  router.put('/risk/config',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlRisk.updateRiskConfig));

  router.get('/risk/rate-limits',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlRisk.getRateLimits));

  router.put('/risk/rate-limits',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlRisk.updateRateLimits));

  router.get('/risk/blocked-ips',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlRisk.listBlockedIPs));

  router.post('/risk/block-ip',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlRisk.blockIP));

  router.delete('/risk/block-ip/:blockId',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlRisk.unblockIP));

  router.get('/risk/suspicious',
    protect(ROLE_GROUPS.COMPLIANCE),
    wrap(ctrlRisk.listSuspiciousActivity));

  router.get('/risk/suspicious/:alertId',
    protect(ROLE_GROUPS.COMPLIANCE),
    wrap(ctrlRisk.getSuspiciousAlert));

  router.patch('/risk/suspicious/:alertId',
    protect(ROLE_GROUPS.COMPLIANCE),
    wrap(ctrlRisk.reviewSuspiciousAlert));

  router.post('/risk/suspicious/scan',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlRisk.triggerSuspiciousScan));

  // ─────────────────────────────────────────────────────────────────────
  // Feature Flags
  // ─────────────────────────────────────────────────────────────────────
  router.get('/features',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrlFeatures.listFeatureFlags));

  router.get('/features/audit',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.getFeatureFlagHistory));

  router.get('/features/network-status',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlFeatures.getNetworkStatus));

  router.post('/features/maintenance',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.setMaintenanceMode));

  router.put('/features/network/:network/deposit',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.setNetworkDeposit));

  router.put('/features/network/:network/withdrawal',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.setNetworkWithdrawal));

  router.put('/features/trading-pair/:symbol',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.setTradingPairStatus));

  router.get('/features/:flagKey',
    protect(ROLE_GROUPS.ALL),
    wrap(ctrlFeatures.getFeatureFlag));

  router.put('/features/:flagKey',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlFeatures.setFeatureFlag));

  // ─────────────────────────────────────────────────────────────────────
  // Blockchain Monitoring
  // ─────────────────────────────────────────────────────────────────────
  router.get('/blockchain/stats',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.getBlockchainStats));

  router.get('/blockchain/scanner-status',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.getScannerStatus));

  router.get('/blockchain/transactions',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.listTransactions));

  router.get('/blockchain/transactions/:txId',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.getTransaction));

  router.post('/blockchain/transactions/:txId/retry',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.retryTransaction));

  router.post('/blockchain/transactions/:txId/mark-failed',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.markTransactionFailed));

  router.get('/blockchain/withdrawal-queue',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.getWithdrawalQueue));

  router.post('/blockchain/withdrawal-queue/:withdrawalId/prioritize',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.prioritizeWithdrawal));

  router.get('/blockchain/hot-wallet/balances',
    protect(ROLE_GROUPS.FINANCE),
    wrap(ctrlBlockchain.getHotWalletBalances));

  router.post('/blockchain/rescan',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlBlockchain.triggerRescan));

  // ─────────────────────────────────────────────────────────────────────
  // API Key Management
  // ─────────────────────────────────────────────────────────────────────
  router.get('/apikeys/stats',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.getApiKeyStats));

  router.get('/apikeys',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.listApiKeys));

  router.get('/apikeys/user/:userId',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.getUserApiKeys));

  router.post('/apikeys/user/:userId/revoke-all',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlApiKeys.revokeAllUserApiKeys));

  router.get('/apikeys/key/:keyId',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.getApiKeyDetails));

  router.get('/apikeys/key/:keyId/usage',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.getApiKeyUsage));

  router.patch('/apikeys/key/:keyId/disable',
    protect(ROLE_GROUPS.OPS),
    wrap(ctrlApiKeys.disableApiKey));

  router.patch('/apikeys/key/:keyId/revoke',
    protect(ROLE_GROUPS.SUPER),
    wrap(ctrlApiKeys.revokeApiKey));

  // Register router under /api/admin
  app.use('/api/admin', router);
}

module.exports = { registerAdminExtendedRoutes };
