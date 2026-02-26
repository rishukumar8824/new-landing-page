const ADMIN_ROLES = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'];

const AdminUserSchema = {
  id: 'string (unique)',
  email: 'string (unique, lowercase)',
  passwordHash: 'string',
  role: `enum(${ADMIN_ROLES.join('|')})`,
  status: 'ACTIVE | DISABLED',
  twoFactor: {
    enabled: 'boolean',
    provider: 'totp | sms | email',
    secret: 'string',
    lastVerifiedAt: 'date'
  },
  ipWhitelist: 'string[]',
  lastLoginAt: 'date',
  createdAt: 'date',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminUser',
  collectionName: 'admin_users',
  AdminUserSchema,
  ADMIN_ROLES
};
