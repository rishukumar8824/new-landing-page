const AdminSessionSchema = {
  id: 'string (unique)',
  adminId: 'string (indexed)',
  refreshTokenHash: 'string (unique)',
  ip: 'string',
  userAgent: 'string',
  expiresAt: 'date (TTL)',
  lastSeenAt: 'date',
  revokedAt: 'date | null',
  createdAt: 'date'
};

module.exports = {
  modelName: 'AdminSession',
  collectionName: 'admin_sessions_v2',
  AdminSessionSchema
};
