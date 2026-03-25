const { buildAuditLogRecord } = require('../models/AuditLog');

function createAuditLogService(collections) {
  const { auditLogs } = collections;

  async function log(entry = {}) {
    if (!auditLogs) {
      return null;
    }

    const record = buildAuditLogRecord(entry);
    await auditLogs.insertOne(record);
    return record;
  }

  async function safeLog(entry = {}) {
    try {
      await log(entry);
    } catch (error) {
      // Audit logging should not break request flow.
    }
  }

  return {
    log,
    safeLog
  };
}

module.exports = {
  createAuditLogService
};
