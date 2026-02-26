const AdminRefreshTokenSchema = {
  id: 'string (unique)',
  adminId: 'string (unique)',
  sessionId: 'string',
  tokenHash: 'string (unique)',
  expiresAt: 'date (TTL)',
  createdAt: 'date',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminRefreshToken',
  collectionName: 'admin_refresh_tokens',
  AdminRefreshTokenSchema
};
