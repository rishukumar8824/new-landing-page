import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Deposit = sequelize.define(
  'Deposit',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    coin: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'USDT'
    },
    amount: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false
    },
    tx_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'deposits',
    timestamps: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['status'] }]
  }
);
