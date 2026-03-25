const AdminWalletConfigSchema = {
  coin: 'string (unique)',
  withdrawalsEnabled: 'boolean',
  networkFee: 'number',
  minWithdrawal: 'number',
  maxWithdrawal: 'number',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminWalletConfig',
  collectionName: 'admin_wallet_config',
  AdminWalletConfigSchema
};
