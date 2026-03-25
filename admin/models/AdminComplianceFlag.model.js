const AdminComplianceFlagSchema = {
  id: 'string (unique)',
  userId: 'string',
  type: 'string',
  severity: 'LOW | MEDIUM | HIGH | CRITICAL',
  reason: 'string',
  status: 'OPEN | CLOSED',
  createdBy: 'string',
  createdAt: 'date',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminComplianceFlag',
  collectionName: 'admin_compliance_flags',
  AdminComplianceFlagSchema
};
