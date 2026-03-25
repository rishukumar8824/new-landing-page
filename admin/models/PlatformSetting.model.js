const PlatformSettingSchema = {
  key: 'string (unique)',
  value: 'mixed',
  updatedBy: 'string',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'PlatformSetting',
  collectionName: 'admin_platform_settings',
  PlatformSettingSchema
};
