const AdminP2PConfigSchema = {
  key: 'string (unique)',
  value: {
    p2pFeePercent: 'number',
    minOrderLimit: 'number',
    maxOrderLimit: 'number',
    autoExpiryMinutes: 'number'
  },
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminP2PConfig',
  collectionName: 'admin_p2p_config',
  AdminP2PConfigSchema
};
