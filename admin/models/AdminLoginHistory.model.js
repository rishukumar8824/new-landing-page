const AdminLoginHistorySchema = {
  id: 'string (unique)',
  adminId: 'string',
  email: 'string',
  role: 'string',
  success: 'boolean',
  reason: 'string',
  ip: 'string',
  userAgent: 'string',
  createdAt: 'date (indexed)'
};

module.exports = {
  modelName: 'AdminLoginHistory',
  collectionName: 'admin_login_history',
  AdminLoginHistorySchema
};
