import { User } from './user.js';
import { Wallet } from './wallet.js';
import { Deposit } from './deposit.js';
import { Withdrawal } from './withdrawal.js';

User.hasMany(Wallet, { foreignKey: 'user_id' });
Wallet.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Deposit, { foreignKey: 'user_id' });
Deposit.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Withdrawal, { foreignKey: 'user_id' });
Withdrawal.belongsTo(User, { foreignKey: 'user_id' });

export { User, Wallet, Deposit, Withdrawal };
