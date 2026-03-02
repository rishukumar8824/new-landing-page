import { sequelize } from '../config/db.js';
import { Deposit, Wallet, Withdrawal, User } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import { toDecimal, toDbValue } from '../utils/decimal.js';

const normalizeAction = (action) => String(action || '').trim().toLowerCase();

export const getDeposits = async (req, res, next) => {
  try {
    const deposits = await Deposit.findAll({
      include: [{ model: User, attributes: ['id', 'email'] }],
      order: [['id', 'DESC']]
    });

    return sendSuccess(res, 'Admin deposits fetched', { deposits });
  } catch (error) {
    return next(error);
  }
};

export const approveDeposit = async (req, res, next) => {
  try {
    const depositId = Number(req.body.deposit_id);
    const action = normalizeAction(req.body.action);

    if (!depositId || !['approve', 'reject'].includes(action)) {
      throw new AppError('deposit_id and valid action are required', 422);
    }

    const result = await sequelize.transaction(async (transaction) => {
      const deposit = await Deposit.findOne({
        where: { id: depositId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!deposit) {
        throw new AppError('Deposit not found', 404);
      }

      if (deposit.status !== 'pending') {
        throw new AppError('Deposit already processed', 409);
      }

      let wallet = await Wallet.findOne({
        where: { user_id: deposit.user_id, coin: deposit.coin },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        wallet = await Wallet.create(
          {
            user_id: deposit.user_id,
            coin: deposit.coin,
            available_balance: '0.00000000',
            locked_balance: '0.00000000'
          },
          { transaction }
        );
      }

      if (action === 'approve') {
        const available = toDecimal(wallet.available_balance);
        const amount = toDecimal(deposit.amount);
        wallet.available_balance = toDbValue(available.plus(amount));
        await wallet.save({ transaction });
        deposit.status = 'approved';
      } else {
        deposit.status = 'rejected';
      }

      await deposit.save({ transaction });

      return { deposit, wallet };
    });

    return sendSuccess(res, 'Deposit request processed', {
      deposit: result.deposit,
      wallet: {
        available_balance: result.wallet.available_balance,
        locked_balance: result.wallet.locked_balance
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      include: [{ model: User, attributes: ['id', 'email'] }],
      order: [['id', 'DESC']]
    });

    return sendSuccess(res, 'Admin withdrawals fetched', { withdrawals });
  } catch (error) {
    return next(error);
  }
};

export const approveWithdraw = async (req, res, next) => {
  try {
    const withdrawalId = Number(req.body.withdrawal_id);
    const action = normalizeAction(req.body.action);
    const txHash = req.body.tx_hash ? String(req.body.tx_hash).trim() : null;

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      throw new AppError('withdrawal_id and valid action are required', 422);
    }

    if (action === 'approve' && !txHash) {
      throw new AppError('tx_hash is required for approval', 422);
    }

    const result = await sequelize.transaction(async (transaction) => {
      const withdrawal = await Withdrawal.findOne({
        where: { id: withdrawalId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!withdrawal) {
        throw new AppError('Withdrawal not found', 404);
      }

      if (withdrawal.status !== 'pending') {
        throw new AppError('Withdrawal already processed', 409);
      }

      const wallet = await Wallet.findOne({
        where: { user_id: withdrawal.user_id, coin: withdrawal.coin },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      const amount = toDecimal(withdrawal.amount);
      const available = toDecimal(wallet.available_balance);
      const locked = toDecimal(wallet.locked_balance);

      if (locked.lt(amount)) {
        throw new AppError('Insufficient locked balance for settlement', 409);
      }

      if (action === 'approve') {
        // Final settlement: release locked amount out of platform.
        wallet.locked_balance = toDbValue(locked.minus(amount));
        withdrawal.status = 'approved';
        withdrawal.tx_hash = txHash;
      } else {
        // Rejection rollback: unlock back to user available balance.
        wallet.locked_balance = toDbValue(locked.minus(amount));
        wallet.available_balance = toDbValue(available.plus(amount));
        withdrawal.status = 'rejected';
        withdrawal.tx_hash = txHash;
      }

      if (toDecimal(wallet.available_balance).lt(0) || toDecimal(wallet.locked_balance).lt(0)) {
        throw new AppError('Invalid wallet state', 500);
      }

      await wallet.save({ transaction });
      await withdrawal.save({ transaction });

      return { wallet, withdrawal };
    });

    return sendSuccess(res, 'Withdrawal request processed', {
      withdrawal: result.withdrawal,
      wallet: {
        available_balance: result.wallet.available_balance,
        locked_balance: result.wallet.locked_balance
      }
    });
  } catch (error) {
    return next(error);
  }
};
