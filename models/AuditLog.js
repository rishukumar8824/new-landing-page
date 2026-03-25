function buildAuditLogRecord(input = {}) {
  return {
    userId: String(input.userId || '').trim(),
    action: String(input.action || 'unknown_action').trim().toLowerCase(),
    ipAddress: String(input.ipAddress || '').trim(),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    createdAt: input.createdAt ? new Date(input.createdAt) : new Date()
  };
}

function toAuditLogResponse(doc) {
  if (!doc) {
    return null;
  }

  return {
    userId: String(doc.userId || '').trim(),
    action: String(doc.action || '').trim(),
    ipAddress: String(doc.ipAddress || '').trim(),
    metadata: doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {},
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null
  };
}

module.exports = {
  buildAuditLogRecord,
  toAuditLogResponse
};
