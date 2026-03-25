'use strict';

/**
 * Admin Risk Management Controller
 * - Risk config (leverage, liquidation thresholds)
 * - IP blocking (individual IPs + countries)
 * - Rate limit control
 * - Suspicious activity detection & alerts
 */

function createAdminRiskControllers({ adminStore, extendedStore }) {

  // ─── Risk Configuration ───────────────────────────────────────────────────

  /**
   * GET /api/admin/risk/config
   * Get global risk configuration.
   */
  async function getRiskConfig(req, res) {
    const config = await extendedStore.getRiskConfig();
    return res.json({ config });
  }

  /**
   * PUT /api/admin/risk/config
   * Update risk configuration.
   * Body: {
   *   maxSpotOrderValue: number,
   *   maxDailyWithdrawal: number,
   *   maxFuturesLeverage: number,
   *   maintenanceMarginRate: number,
   *   liquidationThreshold: number,
   *   maxOpenOrders: number,
   *   minWithdrawalAmount: number,
   *   withdrawalRequireKYC: boolean,
   *   p2pMaxAdAmount: number,
   *   p2pMaxDailyVolume: number
   * }
   */
  async function updateRiskConfig(req, res) {
    const allowed = [
      'maxSpotOrderValue', 'maxDailyWithdrawal', 'maxFuturesLeverage',
      'maintenanceMarginRate', 'liquidationThreshold', 'maxOpenOrders',
      'minWithdrawalAmount', 'withdrawalRequireKYC', 'p2pMaxAdAmount', 'p2pMaxDailyVolume',
      'autoFreezeOnSuspicious', 'kycRequiredForWithdrawal', 'maxLoginAttemptsPerHour'
    ];

    const patch = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'No valid risk config fields provided.' });
    }

    const config = await extendedStore.updateRiskConfig(patch, req.adminAuth.adminId);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'update_risk_config',
      entityType: 'risk_config',
      entityId: 'global',
      status: 'SUCCESS',
      meta: patch,
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Risk config updated.', config });
  }

  // ─── IP Blocking ──────────────────────────────────────────────────────────

  /**
   * GET /api/admin/risk/blocked-ips
   * List all blocked IPs and countries.
   */
  async function listBlockedIPs(req, res) {
    const data = await extendedStore.listBlockedIPs(req.query);
    return res.json(data);
  }

  /**
   * POST /api/admin/risk/block-ip
   * Block an IP address or country.
   * Body: { ip?: string, country?: string (ISO code), reason: string, permanent?: boolean, expiresAt?: ISO date }
   */
  async function blockIP(req, res) {
    const ip = String(req.body?.ip || '').trim();
    const country = String(req.body?.country || '').trim().toUpperCase();
    const reason = String(req.body?.reason || '').trim();
    const permanent = req.body?.permanent === true;
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!ip && !country) {
      return res.status(400).json({ message: 'Either ip or country is required.' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'reason is required.' });
    }

    const blocked = await extendedStore.blockIP({
      ip: ip || null,
      country: country || null,
      reason,
      permanent,
      expiresAt,
      blockedBy: req.adminAuth.adminId
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'block_ip',
      entityType: 'blocked_ip',
      entityId: blocked.id,
      status: 'SUCCESS',
      meta: { ip, country, reason, permanent },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.status(201).json({ message: 'IP/Country blocked.', blocked });
  }

  /**
   * DELETE /api/admin/risk/block-ip/:blockId
   * Unblock an IP or country.
   */
  async function unblockIP(req, res) {
    const removed = await extendedStore.unblockIP(req.params.blockId);
    if (!removed) return res.status(404).json({ message: 'Block record not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'unblock_ip',
      entityType: 'blocked_ip',
      entityId: req.params.blockId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Unblocked.' });
  }

  // ─── Suspicious Activity ──────────────────────────────────────────────────

  /**
   * GET /api/admin/risk/suspicious
   * List suspicious activity alerts.
   * Query: status (OPEN|REVIEWED|DISMISSED), severity, page, limit
   */
  async function listSuspiciousActivity(req, res) {
    const data = await extendedStore.listSuspiciousActivity(req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/risk/suspicious/:alertId
   * Get suspicious activity alert details.
   */
  async function getSuspiciousAlert(req, res) {
    const alert = await extendedStore.getSuspiciousAlert(req.params.alertId);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    return res.json({ alert });
  }

  /**
   * PATCH /api/admin/risk/suspicious/:alertId
   * Review/dismiss suspicious activity alert.
   * Body: { status: "REVIEWED" | "DISMISSED", notes: string }
   */
  async function reviewSuspiciousAlert(req, res) {
    const status = String(req.body?.status || '').trim().toUpperCase();
    const notes = String(req.body?.notes || '').trim();

    if (!['REVIEWED', 'DISMISSED', 'ESCALATED'].includes(status)) {
      return res.status(400).json({ message: 'status must be REVIEWED, DISMISSED, or ESCALATED.' });
    }

    const updated = await extendedStore.reviewSuspiciousAlert(req.params.alertId, {
      status,
      notes,
      reviewedBy: req.adminAuth.adminId,
      reviewedAt: new Date()
    });

    if (!updated) return res.status(404).json({ message: 'Alert not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'review_suspicious_alert',
      entityType: 'suspicious_alert',
      entityId: req.params.alertId,
      status: 'SUCCESS',
      meta: { newStatus: status, notes },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Alert updated.', alert: updated });
  }

  /**
   * POST /api/admin/risk/suspicious/scan
   * Manually trigger suspicious activity scan.
   */
  async function triggerSuspiciousScan(req, res) {
    const result = await extendedStore.runSuspiciousActivityScan();

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'trigger_suspicious_scan',
      entityType: 'suspicious_scan',
      entityId: 'manual',
      status: 'SUCCESS',
      meta: { alertsFound: result.alertsCreated },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Scan complete.', ...result });
  }

  // ─── Rate Limit Control ───────────────────────────────────────────────────

  /**
   * GET /api/admin/risk/rate-limits
   * View current rate limit settings.
   */
  async function getRateLimits(req, res) {
    const config = await extendedStore.getRateLimitConfig();
    return res.json({ rateLimits: config });
  }

  /**
   * PUT /api/admin/risk/rate-limits
   * Update rate limit settings.
   * Body: { loginWindowMs, loginMaxAttempts, apiWindowMs, apiMaxRequests, withdrawalWindowMs, withdrawalMaxAttempts }
   */
  async function updateRateLimits(req, res) {
    const config = await extendedStore.updateRateLimitConfig(req.body || {}, req.adminAuth.adminId);

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'risk',
      action: 'update_rate_limits',
      entityType: 'rate_limit_config',
      entityId: 'global',
      status: 'SUCCESS',
      meta: req.body || {},
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Rate limits updated.', rateLimits: config });
  }

  /**
   * GET /api/admin/risk/summary
   * Risk dashboard summary.
   */
  async function getRiskSummary(req, res) {
    const data = await extendedStore.getRiskSummary();
    return res.json(data);
  }

  return {
    getRiskConfig,
    updateRiskConfig,
    listBlockedIPs,
    blockIP,
    unblockIP,
    listSuspiciousActivity,
    getSuspiciousAlert,
    reviewSuspiciousAlert,
    triggerSuspiciousScan,
    getRateLimits,
    updateRateLimits,
    getRiskSummary
  };
}

module.exports = { createAdminRiskControllers };
