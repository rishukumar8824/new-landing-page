import { Deposit, Wallet, Withdrawal } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';

export const getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({
      where: {
        user_id: req.user.id,
        coin: 'USDT'
      }
    });

    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    return sendSuccess(res, 'Wallet fetched', {
      wallet: {
        coin: wallet.coin,
        available_balance: wallet.available_balance,
        locked_balance: wallet.locked_balance
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getWalletTransactions = async (req, res, next) => {
  try {
    const [deposits, withdrawals] = await Promise.all([
      Deposit.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      }),
      Withdrawal.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      })
    ]);

    const history = [
      ...deposits.map((item) => ({
        id: item.id,
        type: 'deposit',
        coin: item.coin,
        amount: item.amount,
        status: item.status,
        tx_hash: item.tx_hash,
        created_at: item.created_at
      })),
      ...withdrawals.map((item) => ({
        id: item.id,
        type: 'withdrawal',
        coin: item.coin,
        amount: item.amount,
        status: item.status,
        tx_hash: item.tx_hash,
        to_address: item.to_address,
        created_at: item.created_at
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return sendSuccess(res, 'Wallet transactions fetched', { transactions: history });
  } catch (error) {
    return next(error);
  }
};
