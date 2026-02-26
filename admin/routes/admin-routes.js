const express = require('express');

const ROLE_GROUPS = {
  ALL: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'],
  SUPER: ['SUPER_ADMIN'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_ADMIN'],
  SUPPORT: ['SUPER_ADMIN', 'SUPPORT_ADMIN'],
  COMPLIANCE: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  OPS: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN']
};

function safeString(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function registerAdminRoutes(app, deps) {
  const { adminStore, adminAuthMiddleware, adminControllers } = deps;

  const router = express.Router();

  router.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; connect-src 'self'; font-src 'self' https://cdn.jsdelivr.net"
    );
    next();
  });

  function withLogging(meta, handler) {
    const moduleName = safeString(meta?.module, 'admin');
    const actionName = safeString(meta?.action, 'unknown_action');
    const auditEnabled = meta?.audit !== false;

    return async (req, res, next) => {
      const startedAt = Date.now();
      const ip = adminAuthMiddleware.getRequestIp(req);
      const userAgent = safeString(req.headers['user-agent']);
      let errorMessage = '';

      try {
        await handler(req, res, next);
      } catch (error) {
        errorMessage = safeString(error?.message, 'Unhandled admin route error');
        if (!res.headersSent) {
          const statusCode = Number(error?.status || 500);
          res.status(statusCode).json({ message: statusCode >= 500 ? 'Admin server error.' : errorMessage });
        }
      } finally {
        const durationMs = Date.now() - startedAt;
        const statusCode = Number(res.statusCode || 200);

        try {
          await adminStore.writeApiLog({
            module: moduleName,
            action: actionName,
            method: req.method,
            path: req.originalUrl,
            statusCode,
            durationMs,
            ip,
            userAgent,
            adminId: req.adminAuth?.adminId || '',
            adminRole: req.adminAuth?.adminRole || ''
          });
        } catch (logError) {
          // API logging must never break admin responses.
        }

        if (auditEnabled && req.adminAuth) {
          try {
            await adminStore.writeAuditLog({
              adminId: req.adminAuth.adminId,
              adminEmail: req.adminAuth.adminEmail,
              adminRole: req.adminAuth.adminRole,
              module: moduleName,
              action: actionName,
              entityType: safeString(meta?.entityType),
              entityId: safeString(meta?.entityId),
              status: statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
              reason: statusCode >= 400 ? errorMessage || `HTTP_${statusCode}` : '',
              meta: {
                method: req.method,
                path: req.originalUrl,
                statusCode,
                durationMs
              },
              ip,
              userAgent
            });
          } catch (auditError) {
            // Audit logging failures are swallowed to preserve API availability.
          }
        }
      }
    };
  }

  function protect(roles = ROLE_GROUPS.ALL) {
    return adminAuthMiddleware.requireAdmin(roles);
  }

  // -------------------------
  // Auth
  // -------------------------
  router.post('/auth/login', withLogging({ module: 'auth', action: 'login', audit: false }, adminControllers.authLogin));
  router.post('/auth/refresh', withLogging({ module: 'auth', action: 'refresh', audit: false }, adminControllers.authRefresh));
  router.post('/auth/logout', withLogging({ module: 'auth', action: 'logout' }, adminControllers.authLogout));
  router.get('/auth/me', protect(ROLE_GROUPS.ALL), withLogging({ module: 'auth', action: 'me' }, adminControllers.authMe));

  // -------------------------
  // Dashboard
  // -------------------------
  router.get(
    '/dashboard/overview',
    protect(ROLE_GROUPS.ALL),
    withLogging({ module: 'dashboard', action: 'overview', entityType: 'dashboard' }, async (req, res) => {
      const [revenue, wallet, monitoring] = await Promise.all([
        adminStore.getRevenueSummary(),
        adminStore.getWalletOverview(),
        adminStore.getMonitoringOverview()
      ]);

      return res.json({
        revenue,
        wallet,
        monitoring
      });
    })
  );

  // -------------------------
  // User Management
  // -------------------------
  router.get('/users', protect(ROLE_GROUPS.ALL), withLogging({ module: 'users', action: 'list_users' }, adminControllers.listUsers));
  router.get('/users/:userId', protect(ROLE_GROUPS.ALL), withLogging({ module: 'users', action: 'get_user' }, adminControllers.getUser));
  router.patch('/users/:userId/status', protect(ROLE_GROUPS.OPS), withLogging({ module: 'users', action: 'set_user_status' }, adminControllers.setUserStatus));
  router.post('/users/:userId/reset-password', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'users', action: 'reset_user_password' }, adminControllers.resetUserPassword));
  router.post('/users/:userId/adjust-balance', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'users', action: 'adjust_user_balance' }, adminControllers.adjustUserBalance));
  router.get('/users/:userId/kyc', protect(ROLE_GROUPS.ALL), withLogging({ module: 'users', action: 'get_user_kyc' }, adminControllers.getUserKyc));
  router.post('/users/:userId/kyc/review', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'users', action: 'review_user_kyc' }, adminControllers.reviewUserKyc));

  // -------------------------
  // Wallet Management
  // -------------------------
  router.get('/wallet/overview', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'wallet_overview' }, adminControllers.walletOverview));
  router.get('/wallet/deposits', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'list_deposits' }, adminControllers.listDeposits));
  router.get('/wallet/withdrawals', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'list_withdrawals' }, adminControllers.listWithdrawals));
  router.post('/wallet/withdrawals/:withdrawalId/review', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'review_withdrawal' }, adminControllers.reviewWithdrawal));
  router.put('/wallet/config/:coin', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'set_coin_config' }, adminControllers.setCoinConfig));
  router.get('/wallet/hot-balances', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'wallet', action: 'hot_balances' }, adminControllers.listHotWallets));

  // -------------------------
  // Spot Trading Control
  // -------------------------
  router.get('/spot/pairs', protect(ROLE_GROUPS.OPS), withLogging({ module: 'spot', action: 'list_pairs' }, adminControllers.listSpotPairs));
  router.put('/spot/pairs/:symbol', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'spot', action: 'update_pair' }, adminControllers.updateSpotPair));
  router.get('/spot/orderbook/:symbol', protect(ROLE_GROUPS.OPS), withLogging({ module: 'spot', action: 'order_book' }, adminControllers.getSpotOrderBook));
  router.post('/spot/orders/:orderId/force-cancel', protect(ROLE_GROUPS.OPS), withLogging({ module: 'spot', action: 'force_cancel_order' }, adminControllers.forceCancelSpotOrder));
  router.get('/spot/trades', protect(ROLE_GROUPS.OPS), withLogging({ module: 'spot', action: 'list_trades' }, adminControllers.listSpotTrades));

  // -------------------------
  // P2P Control
  // -------------------------
  router.get('/p2p/ads', protect(ROLE_GROUPS.OPS), withLogging({ module: 'p2p', action: 'list_ads' }, adminControllers.listP2PAds));
  router.post('/p2p/ads/:offerId/review', protect(ROLE_GROUPS.OPS), withLogging({ module: 'p2p', action: 'review_ad' }, adminControllers.reviewP2PAd));
  router.get('/p2p/disputes', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'p2p', action: 'list_disputes' }, adminControllers.listP2PDisputes));
  router.post('/p2p/orders/:orderId/release', protect(ROLE_GROUPS.OPS), withLogging({ module: 'p2p', action: 'manual_release_escrow' }, adminControllers.manualReleaseP2POrder));
  router.post('/p2p/orders/:orderId/freeze', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'p2p', action: 'freeze_escrow' }, adminControllers.freezeEscrow));
  router.get('/p2p/settings', protect(ROLE_GROUPS.OPS), withLogging({ module: 'p2p', action: 'get_p2p_settings' }, adminControllers.getP2PSettings));
  router.put('/p2p/settings', protect(ROLE_GROUPS.OPS), withLogging({ module: 'p2p', action: 'update_p2p_settings' }, adminControllers.updateP2PSettings));

  // -------------------------
  // Revenue
  // -------------------------
  router.get('/revenue/summary', protect(ROLE_GROUPS.FINANCE), withLogging({ module: 'revenue', action: 'summary' }, adminControllers.revenueSummary));

  // -------------------------
  // Platform Settings
  // -------------------------
  router.get('/settings/platform', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'settings', action: 'get_platform_settings' }, adminControllers.getPlatformSettings));
  router.put('/settings/platform', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'settings', action: 'update_platform_settings' }, adminControllers.updatePlatformSettings));

  // -------------------------
  // Compliance
  // -------------------------
  router.get('/compliance/flags', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'compliance', action: 'list_flags' }, adminControllers.listComplianceFlags));
  router.post('/compliance/flags', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'compliance', action: 'create_flag' }, adminControllers.createComplianceFlag));
  router.get('/compliance/export/transactions.csv', protect(ROLE_GROUPS.COMPLIANCE), withLogging({ module: 'compliance', action: 'export_transactions_csv' }, adminControllers.exportComplianceTransactions));

  // -------------------------
  // Support System
  // -------------------------
  router.get('/support/tickets', protect(ROLE_GROUPS.SUPPORT), withLogging({ module: 'support', action: 'list_tickets' }, adminControllers.listSupportTickets));
  router.post('/support/tickets/:ticketId/reply', protect(ROLE_GROUPS.SUPPORT), withLogging({ module: 'support', action: 'reply_ticket' }, adminControllers.replySupportTicket));
  router.patch('/support/tickets/:ticketId/status', protect(ROLE_GROUPS.SUPPORT), withLogging({ module: 'support', action: 'update_ticket_status' }, adminControllers.updateSupportTicketStatus));
  router.patch('/support/tickets/:ticketId/assign', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'support', action: 'assign_ticket' }, adminControllers.assignSupportTicket));

  // -------------------------
  // Monitoring + Audit
  // -------------------------
  router.get('/monitoring/overview', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'monitoring', action: 'overview' }, adminControllers.monitoringOverview));
  router.get('/monitoring/api-logs', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'monitoring', action: 'api_logs' }, adminControllers.monitoringApiLogs));
  router.get('/monitoring/health', protect(ROLE_GROUPS.ALL), withLogging({ module: 'monitoring', action: 'health', audit: false }, adminControllers.monitoringHealth));
  router.get('/audit/logs', protect(ROLE_GROUPS.SUPER), withLogging({ module: 'audit', action: 'list_logs' }, adminControllers.listAuditLogs));

  app.use('/api/admin', router);

  // Backward-compatible aliases for older frontend integrations.
  app.post('/api/admin/login', withLogging({ module: 'auth', action: 'legacy_login', audit: false }, async (req, res) => {
    if (!req.body?.email && req.body?.username) {
      req.body.email = String(req.body.username).includes('@')
        ? String(req.body.username)
        : `${String(req.body.username).trim().toLowerCase()}@admin.local`;
    }
    return adminControllers.authLogin(req, res);
  }));

  app.post('/api/admin/logout', withLogging({ module: 'auth', action: 'legacy_logout' }, adminControllers.authLogout));
}

module.exports = {
  registerAdminRoutes,
  ROLE_GROUPS
};
