import { sequelize } from '../config/db.js';
import { Wallet, Withdrawal } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import { assertPositiveAmount, toDecimal, toDbValue } from '../utils/decimal.js';

export const createWithdrawRequest = async (req, res, next) => {
  try {
    const coin = String(req.body.coin || 'USDT').toUpperCase();
    const toAddress = String(req.body.to_address || '').trim();
    const amount = assertPositiveAmount(req.body.amount);

    if (coin !== 'USDT') {
      throw new AppError('Only USDT is supported right now', 422);
    }

    if (!toAddress) {
      throw new AppError('to_address is required', 422);
    }

    const response = await sequelize.transaction(async (transaction) => {
      // Row-level lock to prevent race conditions and double spending.
      const wallet = await Wallet.findOne({
        where: { user_id: req.user.id, coin },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      const available = toDecimal(wallet.available_balance);
      const locked = toDecimal(wallet.locked_balance);

      if (available.lt(amount)) {
        throw new AppError('Insufficient available balance', 422, {
          available: wallet.available_balance,
          requested: amount.toFixed(8)
        });
      }

      const nextAvailable = available.minus(amount);
      const nextLocked = locked.plus(amount);

      if (nextAvailable.lt(0) || nextLocked.lt(0)) {
        throw new AppError('Invalid wallet state', 500);
      }

      wallet.available_balance = toDbValue(nextAvailable);
      wallet.locked_balance = toDbValue(nextLocked);
      await wallet.save({ transaction });

      const withdrawal = await Withdrawal.create(
        {
          user_id: req.user.id,
          coin,
          amount: toDbValue(amount),
          to_address: toAddress,
          status: 'pending'
        },
        { transaction }
      );

      return { wallet, withdrawal };
    });

    return sendSuccess(
      res,
      'Withdrawal request submitted',
      {
        withdrawal: response.withdrawal,
        wallet: {
          available_balance: response.wallet.available_balance,
          locked_balance: response.wallet.locked_balance
        }
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const getUserWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      where: { user_id: req.user.id },
      order: [['id', 'DESC']]
    });

    return sendSuccess(res, 'User withdrawals fetched', { withdrawals });
  } catch (error) {
    return next(error);
  }
};
