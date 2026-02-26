const AdminHotWalletSchema = {
  coin: 'string (unique)',
  network: 'string',
  balance: 'number',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminHotWallet',
  collectionName: 'admin_hot_wallets',
  AdminHotWalletSchema
};
