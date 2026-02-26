const AuditLogSchema = {
  id: 'string (unique)',
  adminId: 'string',
  adminEmail: 'string',
  adminRole: 'string',
  module: 'string',
  action: 'string',
  entityType: 'string',
  entityId: 'string',
  status: 'SUCCESS | FAILURE',
  reason: 'string',
  meta: 'object',
  ip: 'string',
  userAgent: 'string',
  createdAt: 'date (indexed)'
};

module.exports = {
  modelName: 'AuditLog',
  collectionName: 'admin_audit_logs',
  AuditLogSchema
};
