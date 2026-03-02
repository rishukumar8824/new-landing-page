import { Deposit } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';
import { assertPositiveAmount, toDbValue } from '../utils/decimal.js';

export const createDepositRequest = async (req, res, next) => {
  try {
    const coin = String(req.body.coin || 'USDT').toUpperCase();
    const txHash = req.body.tx_hash ? String(req.body.tx_hash).trim() : null;
    const amount = assertPositiveAmount(req.body.amount);

    if (coin !== 'USDT') {
      throw new AppError('Only USDT is supported right now', 422);
    }

    const deposit = await Deposit.create({
      user_id: req.user.id,
      coin,
      amount: toDbValue(amount),
      tx_hash: txHash,
      status: 'pending'
    });

    return sendSuccess(
      res,
      'Deposit request submitted',
      {
        deposit: {
          id: deposit.id,
          coin: deposit.coin,
          amount: deposit.amount,
          status: deposit.status,
          tx_hash: deposit.tx_hash
        }
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const getUserDeposits = async (req, res, next) => {
  try {
    const deposits = await Deposit.findAll({
      where: { user_id: req.user.id },
      order: [['id', 'DESC']]
    });

    return sendSuccess(res, 'User deposits fetched', { deposits });
  } catch (error) {
    return next(error);
  }
};
