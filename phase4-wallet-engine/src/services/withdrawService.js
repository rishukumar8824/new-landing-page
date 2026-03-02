import Decimal from 'decimal.js';
import * as TronWebPackage from 'tronweb';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Wallet, Withdrawal } from '../models/index.js';
import { AppError } from '../utils/appError.js';
import { assertPositiveAmount, toDecimal, toDbValue } from '../utils/decimal.js';
import { TRON_MAINNET_RPC, USDT_TRC20_CONTRACT, validateTronAddress } from './tronService.js';

const SUPPORTED_COIN = 'USDT';
const TRC20_DECIMALS = 6;
const SUN_PER_TRX = new Decimal('1000000');
const TRC20_BASE = new Decimal(10).pow(TRC20_DECIMALS);
const FEE_LIMIT_SUN = Math.max(
  1,
  Number.parseInt(String(process.env.TRON_FEE_LIMIT_SUN || '150000000'), 10) || 150000000
);
const MIN_TRX_FOR_GAS = new Decimal(String(process.env.TRON_MIN_TRX_FOR_GAS || '20'));
const APPROVAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const APPROVAL_RATE_LIMIT_MAX_CALLS = 30;
const APPROVAL_DB_LOCK_TIMEOUT_SECONDS = Math.max(
  1,
  Number.parseInt(String(process.env.TRON_APPROVAL_LOCK_TIMEOUT_SECONDS || '10'), 10) || 10
);

const approvalWindowTimestamps = [];
const localApprovalLocks = new Set();

const TronWeb = TronWebPackage.TronWeb || TronWebPackage.default?.TronWeb || TronWebPackage.default;

const readScalarFromRow = (row) => {
  if (!row || typeof row !== 'object') {
    return 0;
  }
  const firstValue = Object.values(row)[0];
  const numeric = Number(firstValue);
  return Number.isFinite(numeric) ? numeric : 0;
};

const acquireDbLock = async (lockKey, timeoutSeconds = APPROVAL_DB_LOCK_TIMEOUT_SECONDS) => {
  const rows = await sequelize.query('SELECT GET_LOCK(:lockKey, :timeoutSeconds) AS lock_acquired', {
    type: QueryTypes.SELECT,
    replacements: { lockKey, timeoutSeconds }
  });
  return readScalarFromRow(rows[0]) === 1;
};

const releaseDbLock = async (lockKey) => {
  try {
    await sequelize.query('SELECT RELEASE_LOCK(:lockKey) AS lock_released', {
      type: QueryTypes.SELECT,
      replacements: { lockKey }
    });
  } catch {
    // Ignore lock release failures.
  }
};

const enforceApprovalRateLimitPlaceholder = () => {
  const now = Date.now();
  while (approvalWindowTimestamps.length > 0 && now - approvalWindowTimestamps[0] > APPROVAL_RATE_LIMIT_WINDOW_MS) {
    approvalWindowTimestamps.shift();
  }

  if (approvalWindowTimestamps.length >= APPROVAL_RATE_LIMIT_MAX_CALLS) {
    throw new AppError('Approval rate limit exceeded. Please retry shortly.', 429);
  }

  approvalWindowTimestamps.push(now);
};

const parseWithdrawalId = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Invalid withdrawalId', 422);
  }
  return parsed;
};

const decodeBroadcastCode = (client, code) => {
  const raw = String(code || '').trim();
  if (!raw) {
    return '';
  }

  try {
    return String(client.toUtf8(raw) || '').trim() || raw;
  } catch {
    return raw;
  }
};

const getHotWalletClient = () => {
  if (!TronWeb) {
    throw new AppError('TronWeb dependency is not available', 500);
  }

  const privateKey = String(process.env.TRON_HOT_WALLET_PRIVATE_KEY || process.env.TRON_PRIVATE_KEY || '').trim();
  if (!privateKey) {
    throw new AppError('TRON_HOT_WALLET_PRIVATE_KEY is required', 500);
  }

  const client = new TronWeb({
    fullHost: TRON_MAINNET_RPC,
    privateKey
  });

  let fromAddress = '';
  try {
    fromAddress = String(client.address.fromPrivateKey(privateKey) || '').trim();
  } catch {
    throw new AppError('Invalid TRON_HOT_WALLET_PRIVATE_KEY', 500);
  }

  if (!validateTronAddress(fromAddress)) {
    throw new AppError('Invalid hot wallet address', 500);
  }

  return { client, privateKey, fromAddress };
};

const assertHotWalletGasBalance = async (client, fromAddress) => {
  try {
    const balanceSun = await client.trx.getBalance(fromAddress);
    const trxBalance = new Decimal(String(balanceSun || '0')).div(SUN_PER_TRX);

    if (trxBalance.lt(MIN_TRX_FOR_GAS)) {
      throw new AppError('Insufficient TRX in hot wallet for gas', 422, {
        available_trx: trxBalance.toFixed(6),
        required_trx: MIN_TRX_FOR_GAS.toFixed(6)
      });
    }

    return trxBalance;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(`Failed to verify hot wallet TRX balance: ${error.message}`, 502);
  }
};

const toTrc20BaseUnits = (amountDecimal) => {
  const scaled = amountDecimal.mul(TRC20_BASE);
  if (!scaled.isInteger()) {
    throw new AppError('Withdrawal amount precision exceeds TRC20 token decimals', 422);
  }

  if (scaled.lte(0)) {
    throw new AppError('Withdrawal amount must be greater than 0', 422);
  }

  return scaled.toFixed(0);
};

const broadcastTrc20Transfer = async ({ client, privateKey, fromAddress, toAddress, amountBaseUnits }) => {
  try {
    const trigger = await client.transactionBuilder.triggerSmartContract(
      USDT_TRC20_CONTRACT,
      'transfer(address,uint256)',
      { feeLimit: FEE_LIMIT_SUN },
      [
        { type: 'address', value: toAddress },
        { type: 'uint256', value: amountBaseUnits }
      ],
      fromAddress
    );

    if (!trigger?.result?.result || !trigger?.transaction) {
      throw new Error('Failed to build TRC20 transfer transaction');
    }

    const signedTx = await client.trx.sign(trigger.transaction, privateKey);
    if (!signedTx || !Array.isArray(signedTx.signature) || signedTx.signature.length === 0) {
      throw new Error('Failed to sign TRC20 transfer transaction');
    }

    const broadcastResult = await client.trx.sendRawTransaction(signedTx);
    if (!broadcastResult?.result) {
      const decodedCode = decodeBroadcastCode(client, broadcastResult?.code);
      throw new Error(decodedCode || 'TRC20 transfer broadcast rejected');
    }

    const txHash = String(broadcastResult.txid || signedTx.txID || '').trim();
    if (!txHash) {
      throw new Error('Missing transaction hash after broadcast');
    }

    return txHash;
  } catch (error) {
    throw new AppError(`TRON broadcast failed: ${error.message}`, 502);
  }
};

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

export const approveWithdrawal = async (withdrawalId) => {
  const normalizedWithdrawalId = parseWithdrawalId(withdrawalId);
  enforceApprovalRateLimitPlaceholder();

  if (localApprovalLocks.has(normalizedWithdrawalId)) {
    throw new AppError('Withdrawal approval already in progress', 409);
  }

  localApprovalLocks.add(normalizedWithdrawalId);

  const dbLockKey = `withdrawal_approve_${normalizedWithdrawalId}`;
  let dbLockAcquired = false;
  let broadcastTxHash = '';

  try {
    dbLockAcquired = await acquireDbLock(dbLockKey, APPROVAL_DB_LOCK_TIMEOUT_SECONDS);
    if (!dbLockAcquired) {
      throw new AppError('Withdrawal is locked for approval. Retry shortly.', 409);
    }

    const withdrawal = await Withdrawal.findByPk(normalizedWithdrawalId);
    if (!withdrawal) {
      throw new AppError('Withdrawal not found', 404);
    }

    if (String(withdrawal.status || '').trim().toLowerCase() !== 'pending') {
      throw new AppError('Withdrawal is not pending', 409);
    }

    if (String(withdrawal.tx_hash || '').trim()) {
      throw new AppError('Withdrawal already broadcasted', 409);
    }

    const toAddress = String(withdrawal.to_address || '').trim();
    if (!validateTronAddress(toAddress)) {
      throw new AppError('Invalid TRON address', 422);
    }

    const amountDecimal = assertPositiveAmount(withdrawal.amount, 'amount');
    const amountBaseUnits = toTrc20BaseUnits(amountDecimal);

    const { client, privateKey, fromAddress } = getHotWalletClient();
    await assertHotWalletGasBalance(client, fromAddress);

    broadcastTxHash = await broadcastTrc20Transfer({
      client,
      privateKey,
      fromAddress,
      toAddress,
      amountBaseUnits
    });

    const finalResult = await sequelize.transaction(async (transaction) => {
      const lockedWithdrawal = await Withdrawal.findByPk(normalizedWithdrawalId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!lockedWithdrawal) {
        throw new AppError('Withdrawal not found', 404);
      }

      if (String(lockedWithdrawal.status || '').trim().toLowerCase() !== 'pending') {
        throw new AppError('Withdrawal is not pending', 409);
      }

      if (String(lockedWithdrawal.tx_hash || '').trim()) {
        throw new AppError('Withdrawal already broadcasted', 409);
      }

      const wallet = await Wallet.findOne({
        where: { user_id: lockedWithdrawal.user_id, coin: SUPPORTED_COIN },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      const lockedBalance = toDecimal(wallet.locked_balance);
      if (lockedBalance.lt(amountDecimal)) {
        throw new AppError('Insufficient locked balance', 422, {
          locked: wallet.locked_balance,
          requested: amountDecimal.toFixed(8)
        });
      }

      const nextLocked = lockedBalance.minus(amountDecimal);
      if (nextLocked.lt(0)) {
        throw new AppError('Invalid wallet state', 500);
      }

      wallet.locked_balance = toDbValue(nextLocked);
      await wallet.save({ transaction });

      lockedWithdrawal.tx_hash = broadcastTxHash;
      lockedWithdrawal.status = 'approved';
      await lockedWithdrawal.save({ transaction });

      return {
        withdrawal: lockedWithdrawal,
        wallet: {
          available_balance: wallet.available_balance,
          locked_balance: wallet.locked_balance
        },
        tx_hash: broadcastTxHash
      };
    });

    return finalResult;
  } catch (error) {
    if (broadcastTxHash) {
      try {
        await Withdrawal.update(
          { tx_hash: broadcastTxHash },
          {
            where: {
              id: normalizedWithdrawalId,
              status: 'pending',
              tx_hash: null
            }
          }
        );
      } catch {
        // Ignore best-effort reconciliation marker failures.
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(String(error?.message || 'Failed to approve withdrawal'), 500);
  } finally {
    if (dbLockAcquired) {
      await releaseDbLock(dbLockKey);
    }
    localApprovalLocks.delete(normalizedWithdrawalId);
  }
};
