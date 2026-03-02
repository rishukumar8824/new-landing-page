import { sequelize } from '../config/db.js';
import { Wallet, Withdrawal } from '../models/index.js';
import { AppError } from '../utils/appError.js';
import { assertPositiveAmount, toDecimal, toDbValue } from '../utils/decimal.js';
import { validateTronAddress } from './tronService.js';

const SUPPORTED_COIN = 'USDT';

export const requestWithdraw = async (userId, toAddress, amount) => {
  const normalizedUserId = Number.parseInt(String(userId), 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError('Invalid userId', 422);
  }

  const normalizedAddress = String(toAddress || '').trim();
  if (!normalizedAddress) {
    throw new AppError('toAddress is required', 422);
  }

  if (!validateTronAddress(normalizedAddress)) {
    throw new AppError('Invalid TRON address', 422);
  }

  const withdrawalAmount = assertPositiveAmount(amount, 'amount');

  return sequelize.transaction(async (transaction) => {
    const wallet = await Wallet.findOne({
      where: { user_id: normalizedUserId, coin: SUPPORTED_COIN },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    const availableBalance = toDecimal(wallet.available_balance);
    const lockedBalance = toDecimal(wallet.locked_balance);

    if (availableBalance.lt(withdrawalAmount)) {
      throw new AppError('Insufficient available balance', 422, {
        available: wallet.available_balance,
        requested: withdrawalAmount.toFixed(8)
      });
    }

    const nextAvailable = availableBalance.minus(withdrawalAmount);
    const nextLocked = lockedBalance.plus(withdrawalAmount);

    if (nextAvailable.lt(0) || nextLocked.lt(0)) {
      throw new AppError('Invalid wallet state', 500);
    }

    wallet.available_balance = toDbValue(nextAvailable);
    wallet.locked_balance = toDbValue(nextLocked);
    await wallet.save({ transaction });

    const withdrawal = await Withdrawal.create(
      {
        user_id: normalizedUserId,
        coin: SUPPORTED_COIN,
        amount: toDbValue(withdrawalAmount),
        to_address: normalizedAddress,
        status: 'pending'
      },
      { transaction }
    );

    return {
      withdrawal,
      wallet: {
        available_balance: wallet.available_balance,
        locked_balance: wallet.locked_balance
      },
      blockchainSendTriggered: false
    };
  });
};
