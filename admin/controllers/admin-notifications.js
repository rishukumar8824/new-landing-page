'use strict';

/**
 * Admin Notifications Controller
 * - Global announcements
 * - User-specific notifications
 * - Push/email notification management
 */

function createAdminNotificationsControllers({ adminStore, extendedStore }) {

  /**
   * GET /api/admin/notifications
   * List all notifications. Filter: type, status, page, limit.
   */
  async function listNotifications(req, res) {
    const data = await extendedStore.listNotifications(req.query);
    return res.json(data);
  }

  /**
   * POST /api/admin/notifications
   * Create global or user-specific notification.
   * Body: {
   *   type: "GLOBAL" | "USER",
   *   userId?: string (required if type=USER),
   *   title: string,
   *   message: string,
   *   channel: "APP" | "EMAIL" | "BOTH",
   *   priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
   *   scheduledAt?: ISO date string (for scheduled)
   * }
   */
  async function createNotification(req, res) {
    const type = String(req.body?.type || 'GLOBAL').trim().toUpperCase();
    const userId = String(req.body?.userId || '').trim();
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const channel = String(req.body?.channel || 'APP').trim().toUpperCase();
    const priority = String(req.body?.priority || 'NORMAL').trim().toUpperCase();
    const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;

    if (!['GLOBAL', 'USER'].includes(type)) {
      return res.status(400).json({ message: 'type must be GLOBAL or USER.' });
    }
    if (type === 'USER' && !userId) {
      return res.status(400).json({ message: 'userId is required for USER type notification.' });
    }
    if (!title) return res.status(400).json({ message: 'title is required.' });
    if (!message) return res.status(400).json({ message: 'message is required.' });
    if (!['APP', 'EMAIL', 'BOTH'].includes(channel)) {
      return res.status(400).json({ message: 'channel must be APP, EMAIL, or BOTH.' });
    }
    if (!['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(priority)) {
      return res.status(400).json({ message: 'priority must be LOW, NORMAL, HIGH, or CRITICAL.' });
    }

    const notification = await extendedStore.createNotification({
      type,
      userId: type === 'USER' ? userId : null,
      title,
      message,
      channel,
      priority,
      scheduledAt,
      createdBy: req.adminAuth.adminId
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'notifications',
      action: 'create_notification',
      entityType: 'notification',
      entityId: notification.id,
      status: 'SUCCESS',
      meta: { type, userId, title, channel, priority },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.status(201).json({ message: 'Notification created.', notification });
  }

  /**
   * GET /api/admin/notifications/:notificationId
   * Get single notification details.
   */
  async function getNotification(req, res) {
    const notification = await extendedStore.getNotificationById(req.params.notificationId);
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json({ notification });
  }

  /**
   * PATCH /api/admin/notifications/:notificationId/status
   * Update notification status: ACTIVE | PAUSED | CANCELLED
   * Body: { status: "PAUSED" }
   */
  async function updateNotificationStatus(req, res) {
    const status = String(req.body?.status || '').trim().toUpperCase();
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'status must be ACTIVE, PAUSED, or CANCELLED.' });
    }

    const updated = await extendedStore.updateNotificationStatus(req.params.notificationId, status);
    if (!updated) return res.status(404).json({ message: 'Notification not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'notifications',
      action: 'update_notification_status',
      entityType: 'notification',
      entityId: req.params.notificationId,
      status: 'SUCCESS',
      meta: { newStatus: status },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: `Notification status set to ${status}.`, notification: updated });
  }

  /**
   * DELETE /api/admin/notifications/:notificationId
   * Delete notification.
   */
  async function deleteNotification(req, res) {
    const deleted = await extendedStore.deleteNotification(req.params.notificationId);
    if (!deleted) return res.status(404).json({ message: 'Notification not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'notifications',
      action: 'delete_notification',
      entityType: 'notification',
      entityId: req.params.notificationId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Notification deleted.' });
  }

  /**
   * POST /api/admin/notifications/broadcast
   * Broadcast urgent global message to all users.
   * Body: { title, message, priority }
   */
  async function broadcastNotification(req, res) {
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const priority = String(req.body?.priority || 'HIGH').trim().toUpperCase();

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required.' });
    }

    const notification = await extendedStore.createNotification({
      type: 'GLOBAL',
      userId: null,
      title,
      message,
      channel: 'BOTH',
      priority,
      scheduledAt: null,
      createdBy: req.adminAuth.adminId,
      isBroadcast: true
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'notifications',
      action: 'broadcast',
      entityType: 'notification',
      entityId: notification.id,
      status: 'SUCCESS',
      meta: { title, priority },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.status(201).json({ message: 'Broadcast sent.', notification });
  }

  /**
   * GET /api/admin/notifications/stats
   * Notification delivery statistics.
   */
  async function getNotificationStats(req, res) {
    const stats = await extendedStore.getNotificationStats();
    return res.json(stats);
  }

  return {
    listNotifications,
    createNotification,
    getNotification,
    updateNotificationStatus,
    deleteNotification,
    broadcastNotification,
    getNotificationStats
  };
}

module.exports = { createAdminNotificationsControllers };
