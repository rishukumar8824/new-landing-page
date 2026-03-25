const AdminSpotPairSchema = {
  symbol: 'string (unique)',
  enabled: 'boolean',
  makerFee: 'number',
  takerFee: 'number',
  pricePrecision: 'number',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'AdminSpotPair',
  collectionName: 'admin_spot_pairs',
  AdminSpotPairSchema
};
