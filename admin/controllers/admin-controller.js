function createInMemoryRateLimiter({ windowMs, maxAttempts }) {
  const attempts = new Map();

  return function check(key) {
    const now = Date.now();
    const normalizedKey = String(key || 'unknown');
    const existing = attempts.get(normalizedKey);

    if (!existing || now > existing.resetAt) {
      attempts.set(normalizedKey, {
        count: 1,
        resetAt: now + windowMs
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      };
    }

    existing.count += 1;
    attempts.set(normalizedKey, existing);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function isValidUsername(username) {
  return /^[a-z0-9._-]{3,32}$/i.test(String(username || '').trim());
}

function isValidPassword(password) {
  return String(password || '').trim().length >= 8;
}

function isValidOtp(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

function createAdminControllers({
  adminStore,
  auth,
  repos,
  setCookie,
  clearCookie,
  cookieNames
}) {
  const loginLimiter = createInMemoryRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

  async function logAudit(req, payload = {}) {
    if (!req.adminAuth) {
      return;
    }

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent,
      module: payload.module || 'general',
      action: payload.action || 'unknown',
      entityType: payload.entityType || '',
      entityId: payload.entityId || '',
      status: payload.status || 'SUCCESS',
      reason: payload.reason || '',
      meta: payload.meta || {}
    });
  }

  function setAdminCookies(res, tokenPair) {
    setCookie(res, cookieNames.accessToken, tokenPair.accessToken, 15 * 60);
    setCookie(res, cookieNames.refreshToken, tokenPair.refreshToken, 7 * 24 * 60 * 60);
  }

  function clearAdminCookies(res) {
    clearCookie(res, cookieNames.accessToken);
    clearCookie(res, cookieNames.refreshToken);
  }

  async function authLogin(req, res) {
    const ip = auth.getRequestIp(req);
    const userAgent = String(req.headers['user-agent'] || '');
    const limiter = loginLimiter(`admin_login:${ip}`);
    if (!limiter.allowed) {
      res.setHeader('Retry-After', String(limiter.retryAfterSeconds));
      return res.status(429).json({
        message: 'Too many login attempts. Please try again later.',
        retryAfterSeconds: limiter.retryAfterSeconds
      });
    }

    const identifier = String(req.body?.email || req.body?.username || req.body?.identifier || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '').trim();
    const otpCode = String(req.body?.otpCode || '').trim();

    if (!identifier) {
      return res.status(400).json({ message: 'Admin email or username is required.' });
    }

    if (identifier.includes('@')) {
      if (!isValidEmail(identifier)) {
        return res.status(400).json({ message: 'Enter a valid admin email.' });
      }
    } else if (!isValidUsername(identifier)) {
      return res.status(400).json({ message: 'Enter a valid admin username.' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const admin = typeof adminStore.getAdminByIdentifier === 'function' ? await adminStore.getAdminByIdentifier(identifier) : null;
    const loginEmail = String(admin?.email || identifier).trim().toLowerCase();
    if (!admin || !repos.verifyPassword(password, admin.passwordHash)) {
      await adminStore.writeLoginHistory({
        adminId: admin?.id || '',
        email: loginEmail,
        role: admin?.role || '',
        success: false,
        reason: 'INVALID_CREDENTIALS',
        ip,
        userAgent
      });
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    if (String(admin.status || '').toUpperCase() !== 'ACTIVE') {
      await adminStore.writeLoginHistory({
        adminId: admin.id,
        email: loginEmail,
        role: admin.role,
        success: false,
        reason: 'ADMIN_DISABLED',
        ip,
        userAgent
      });
      return res.status(403).json({ message: 'Admin account is disabled.' });
    }

    if (!auth.validateIpWhitelist(ip, admin)) {
      await adminStore.writeLoginHistory({
        adminId: admin.id,
        email: loginEmail,
        role: admin.role,
        success: false,
        reason: 'IP_NOT_ALLOWED',
        ip,
        userAgent
      });
      return res.status(403).json({ message: 'IP is not allowed for admin login.' });
    }

    if (admin.twoFactor?.enabled) {
      if (!otpCode) {
        return res.status(403).json({
          message: 'Two-factor authentication code required.',
          twoFactorRequired: true
        });
      }
      if (!isValidOtp(otpCode)) {
        return res.status(401).json({ message: 'Invalid 2FA code format.' });
      }
      // 2FA-ready structure: OTP verification provider can be plugged here.
    }

    const session = await adminStore.createAdminSession(admin, { ip, userAgent });

    await adminStore.writeLoginHistory({
      adminId: admin.id,
      email: loginEmail,
      role: admin.role,
      success: true,
      reason: 'LOGIN_SUCCESS',
      ip,
      userAgent
    });

    setAdminCookies(res, session.tokenPair);

    await adminStore.writeAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      module: 'auth',
      action: 'login',
      entityType: 'admin_user',
      entityId: admin.id,
      status: 'SUCCESS',
      reason: '',
      meta: { sessionId: session.sessionId },
      ip,
      userAgent
    });

    return res.json({
      message: 'Admin login successful.',
      admin: adminStore.sanitizeAdmin(admin),
      accessToken: session.tokenPair.accessToken,
      refreshToken: session.tokenPair.refreshToken,
      sessionExpiresAt: session.expiresAt.toISOString()
    });
  }

  async function authRefresh(req, res) {
    try {
      const refreshToken = auth.extractRefreshToken(req);
      if (!refreshToken) {
        clearAdminCookies(res);
        return res.status(401).json({ message: 'Refresh token is required.' });
      }

      const rotated = await adminStore.rotateAdminRefreshToken(refreshToken);
      setAdminCookies(res, rotated.tokenPair);
      return res.json({
        accessToken: rotated.tokenPair.accessToken,
        refreshToken: rotated.tokenPair.refreshToken
      });
    } catch (error) {
      clearAdminCookies(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }
  }

  async function authLogout(req, res) {
    try {
      const refreshToken = auth.extractRefreshToken(req);
      if (refreshToken) {
        await adminStore.revokeAdminRefreshToken(refreshToken);
      }
      clearAdminCookies(res);

      if (req.adminAuth) {
        await logAudit(req, {
          module: 'auth',
          action: 'logout',
          entityType: 'admin_user',
          entityId: req.adminAuth.adminId
        });
      }

      return res.json({ message: 'Admin logged out successfully.' });
    } catch (error) {
      clearAdminCookies(res);
      return res.status(500).json({ message: 'Server error while logging out.' });
    }
  }

  async function authMe(req, res) {
    const admin = await adminStore.getAdminById(req.adminAuth.adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    return res.json({ admin: adminStore.sanitizeAdmin(admin) });
  }

  async function listUsers(req, res) {
    const data = await adminStore.listUsers(req.query);
    return res.json(data);
  }

  async function getUser(req, res) {
    const user = await adminStore.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user });
  }

  async function setUserStatus(req, res) {
    const status = String(req.body?.status || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim();
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const user = await adminStore.updateUserStatus(req.params.userId, {
      status,
      reason
    });

    await logAudit(req, {
      module: 'users',
      action: 'set_status',
      entityType: 'user',
      entityId: req.params.userId,
      meta: { status, reason }
    });

    return res.json({ message: 'User status updated.', user });
  }

  async function resetUserPassword(req, res) {
    const newPassword = String(req.body?.newPassword || '').trim();
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const result = await adminStore.resetUserPassword(req.params.userId, newPassword);

    await logAudit(req, {
      module: 'users',
      action: 'reset_password',
      entityType: 'user',
      entityId: req.params.userId
    });

    return res.json({
      message: 'Password reset completed.',
      result
    });
  }

  async function adjustUserBalance(req, res) {
    const amount = Number(req.body?.amount || 0);
    const reason = String(req.body?.reason || '').trim();
    const coin = String(req.body?.coin || 'USDT').trim().toUpperCase();

    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ message: 'Amount must be a non-zero number.' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required for balance adjustment.' });
    }

    const wallet = await adminStore.adjustUserBalance(req.params.userId, amount, reason, coin);

    await logAudit(req, {
      module: 'users',
      action: 'balance_adjustment',
      entityType: 'wallet',
      entityId: req.params.userId,
      meta: { amount, reason, coin }
    });

    return res.json({
      message: 'Balance adjusted successfully.',
      wallet
    });
  }

  async function getUserKyc(req, res) {
    const data = await adminStore.getUserKyc(req.params.userId);
    return res.json(data);
  }

  async function reviewUserKyc(req, res) {
    const decision = String(req.body?.decision || '').trim().toUpperCase();
    const remarks = String(req.body?.remarks || '').trim();
    const data = await adminStore.reviewKyc(req.params.userId, decision, remarks);

    await logAudit(req, {
      module: 'users',
      action: 'kyc_review',
      entityType: 'kyc',
      entityId: req.params.userId,
      meta: { decision, remarks }
    });

    return res.json({ message: 'KYC review saved.', data });
  }

  async function walletOverview(req, res) {
    const data = await adminStore.getWalletOverview();
    return res.json(data);
  }

  async function listDeposits(req, res) {
    const data = await adminStore.listDeposits(req.query);
    return res.json(data);
  }

  async function listWithdrawals(req, res) {
    const data = await adminStore.listWithdrawals(req.query);
    return res.json(data);
  }

  async function reviewWithdrawal(req, res) {
    const decision = String(req.body?.decision || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim();
    const data = await adminStore.reviewWithdrawal(req.params.withdrawalId, decision, reason, {
      id: req.adminAuth.adminId,
      role: req.adminAuth.adminRole
    });

    await logAudit(req, {
      module: 'wallet',
      action: 'review_withdrawal',
      entityType: 'withdrawal',
      entityId: req.params.withdrawalId,
      meta: { decision, reason }
    });

    return res.json({ message: 'Withdrawal reviewed.', withdrawal: data });
  }

  async function setCoinConfig(req, res) {
    const data = await adminStore.setCoinWithdrawalConfig(req.params.coin, req.body || {});

    await logAudit(req, {
      module: 'wallet',
      action: 'set_coin_config',
      entityType: 'wallet_config',
      entityId: req.params.coin,
      meta: req.body || {}
    });

    return res.json({ message: 'Coin withdrawal config updated.', config: data });
  }

  async function listHotWallets(req, res) {
    const data = await adminStore.listHotWalletBalances();
    return res.json({ hotWallets: data });
  }

  async function listSpotPairs(req, res) {
    const data = await adminStore.listSpotPairs();
    return res.json({ pairs: data });
  }

  async function updateSpotPair(req, res) {
    const data = await adminStore.updateSpotPair(req.params.symbol, req.body || {});

    await logAudit(req, {
      module: 'spot',
      action: 'update_pair',
      entityType: 'spot_pair',
      entityId: req.params.symbol,
      meta: req.body || {}
    });

    return res.json({ message: 'Spot pair updated.', pair: data });
  }

  async function getSpotOrderBook(req, res) {
    const data = await adminStore.getSpotOrderBook(req.params.symbol);
    return res.json(data);
  }

  async function forceCancelSpotOrder(req, res) {
    const data = await adminStore.forceCancelSpotOrder(req.params.orderId, {
      id: req.adminAuth.adminId
    });

    await logAudit(req, {
      module: 'spot',
      action: 'force_cancel_order',
      entityType: 'spot_order',
      entityId: req.params.orderId
    });

    return res.json({ message: 'Order cancelled by admin.', order: data });
  }

  async function listSpotTrades(req, res) {
    const data = await adminStore.listSpotTrades(req.query);
    return res.json(data);
  }

  async function listP2PAds(req, res) {
    const data = await adminStore.listP2PAds(req.query);
    return res.json(data);
  }

  async function reviewP2PAd(req, res) {
    const decision = String(req.body?.decision || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim();

    const data = await adminStore.reviewP2PAd(req.params.offerId, decision, reason, {
      id: req.adminAuth.adminId
    });

    await logAudit(req, {
      module: 'p2p',
      action: 'review_ad',
      entityType: 'p2p_offer',
      entityId: req.params.offerId,
      meta: { decision, reason }
    });

    return res.json({ message: 'P2P ad review updated.', offer: data });
  }

  async function listP2PDisputes(req, res) {
    const data = await adminStore.listP2PDisputes(req.query);
    return res.json(data);
  }

  async function manualReleaseP2POrder(req, res) {
    const data = await adminStore.manualReleaseEscrow(req.params.orderId, {
      id: req.adminAuth.adminId,
      email: req.adminAuth.adminEmail
    });

    await logAudit(req, {
      module: 'p2p',
      action: 'manual_release_escrow',
      entityType: 'p2p_order',
      entityId: req.params.orderId
    });

    return res.json({ message: 'Escrow released manually.', order: data });
  }

  async function freezeEscrow(req, res) {
    const data = await adminStore.freezeEscrow(req.params.orderId, {
      id: req.adminAuth.adminId,
      email: req.adminAuth.adminEmail
    });

    await logAudit(req, {
      module: 'p2p',
      action: 'freeze_escrow',
      entityType: 'p2p_order',
      entityId: req.params.orderId
    });

    return res.json({ message: 'Escrow frozen.', order: data });
  }

  async function getP2PSettings(req, res) {
    const settings = await adminStore.getP2PSettings();
    return res.json({ settings });
  }

  async function updateP2PSettings(req, res) {
    const settings = await adminStore.updateP2PSettings(req.body || {});

    await logAudit(req, {
      module: 'p2p',
      action: 'update_p2p_settings',
      entityType: 'p2p_settings',
      entityId: 'global',
      meta: req.body || {}
    });

    return res.json({ message: 'P2P settings updated.', settings });
  }

  async function revenueSummary(req, res) {
    const data = await adminStore.getRevenueSummary();
    return res.json(data);
  }

  async function getPlatformSettings(req, res) {
    const settings = await adminStore.getPlatformSettings();
    return res.json({ settings });
  }

  async function updatePlatformSettings(req, res) {
    const settings = await adminStore.updatePlatformSettings(req.body || {}, req.adminAuth.adminId);

    await logAudit(req, {
      module: 'settings',
      action: 'update_platform_settings',
      entityType: 'platform_settings',
      entityId: 'global',
      meta: req.body || {}
    });

    return res.json({ message: 'Platform settings updated.', settings });
  }

  async function listComplianceFlags(req, res) {
    const data = await adminStore.listComplianceFlags(req.query);
    return res.json(data);
  }

  async function createComplianceFlag(req, res) {
    const userId = String(req.body?.userId || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!userId || !reason) {
      return res.status(400).json({ message: 'userId and reason are required.' });
    }

    const data = await adminStore.createComplianceFlag(req.body || {}, {
      id: req.adminAuth.adminId
    });

    await logAudit(req, {
      module: 'compliance',
      action: 'create_flag',
      entityType: 'compliance_flag',
      entityId: data.id,
      meta: { userId, reason }
    });

    return res.status(201).json({ message: 'Compliance flag created.', flag: data });
  }

  async function exportComplianceTransactions(req, res) {
    const csv = await adminStore.exportTransactionsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transaction-logs.csv"');
    return res.status(200).send(csv);
  }

  async function listSupportTickets(req, res) {
    const data = await adminStore.listSupportTickets(req.query);
    return res.json(data);
  }

  async function replySupportTicket(req, res) {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const ticket = await adminStore.replySupportTicket(req.params.ticketId, message, {
      email: req.adminAuth.adminEmail,
      role: req.adminAuth.adminRole
    });

    await logAudit(req, {
      module: 'support',
      action: 'reply_ticket',
      entityType: 'support_ticket',
      entityId: req.params.ticketId
    });

    return res.json({ message: 'Reply sent.', ticket });
  }

  async function updateSupportTicketStatus(req, res) {
    const status = String(req.body?.status || '').trim().toUpperCase();
    const ticket = await adminStore.updateSupportTicketStatus(req.params.ticketId, status);

    await logAudit(req, {
      module: 'support',
      action: 'update_ticket_status',
      entityType: 'support_ticket',
      entityId: req.params.ticketId,
      meta: { status }
    });

    return res.json({ message: 'Ticket status updated.', ticket });
  }

  async function assignSupportTicket(req, res) {
    const assignedTo = String(req.body?.assignedTo || '').trim();
    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo is required.' });
    }

    const ticket = await adminStore.assignSupportTicket(req.params.ticketId, assignedTo);

    await logAudit(req, {
      module: 'support',
      action: 'assign_ticket',
      entityType: 'support_ticket',
      entityId: req.params.ticketId,
      meta: { assignedTo }
    });

    return res.json({ message: 'Ticket assigned.', ticket });
  }

  async function monitoringOverview(req, res) {
    const data = await adminStore.getMonitoringOverview();
    return res.json(data);
  }

  async function monitoringApiLogs(req, res) {
    const data = await adminStore.listApiLogs(req.query);
    return res.json(data);
  }

  async function monitoringHealth(req, res) {
    const dbHealth = await adminStore.getMonitoringOverview();
    return res.json({
      status: dbHealth.dbConnected ? 'ok' : 'degraded',
      db: dbHealth.dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  }

  async function listAuditLogs(req, res) {
    const data = await adminStore.listAuditLogs(req.query);
    return res.json(data);
  }

  return {
    authLogin,
    authRefresh,
    authLogout,
    authMe,
    listUsers,
    getUser,
    setUserStatus,
    resetUserPassword,
    adjustUserBalance,
    getUserKyc,
    reviewUserKyc,
    walletOverview,
    listDeposits,
    listWithdrawals,
    reviewWithdrawal,
    setCoinConfig,
    listHotWallets,
    listSpotPairs,
    updateSpotPair,
    getSpotOrderBook,
    forceCancelSpotOrder,
    listSpotTrades,
    listP2PAds,
    reviewP2PAd,
    listP2PDisputes,
    manualReleaseP2POrder,
    freezeEscrow,
    getP2PSettings,
    updateP2PSettings,
    revenueSummary,
    getPlatformSettings,
    updatePlatformSettings,
    listComplianceFlags,
    createComplianceFlag,
    exportComplianceTransactions,
    listSupportTickets,
    replySupportTicket,
    updateSupportTicketStatus,
    assignSupportTicket,
    monitoringOverview,
    monitoringApiLogs,
    monitoringHealth,
    listAuditLogs,
    logAudit,
    setAdminCookies,
    clearAdminCookies
  };
}

module.exports = {
  createAdminControllers
};
