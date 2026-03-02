import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Wallet = sequelize.define(
  'Wallet',
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
    available_balance: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
      defaultValue: 0
    },
    locked_balance: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'wallets',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'coin']
      }
    ]
  }
);
