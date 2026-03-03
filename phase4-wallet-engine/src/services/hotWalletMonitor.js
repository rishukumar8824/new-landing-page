import Decimal from 'decimal.js';
import { AppError } from '../utils/appError.js';
import { getUSDTBalance, validateTronAddress } from './tronService.js';

const DEFAULT_LOW_BALANCE_THRESHOLD = new Decimal(String(process.env.HOT_WALLET_MIN_USDT || '100'));

const monitorState = {
  started: false,
  timer: null
};

const parseInterval = () => {
  const intervalSeconds = Math.max(
    30,
    Number.parseInt(String(process.env.HOT_WALLET_MONITOR_INTERVAL_SEC || '300'), 10) || 300
  );
  return intervalSeconds * 1000;
};

const normalizeThreshold = () => {
  const threshold = new Decimal(String(process.env.HOT_WALLET_MIN_USDT || DEFAULT_LOW_BALANCE_THRESHOLD.toString()));
  if (!threshold.isFinite() || threshold.lt(0)) {
    return DEFAULT_LOW_BALANCE_THRESHOLD;
  }
  return threshold;
};

export const checkHotWallet = async () => {
  const hotWalletAddress = String(process.env.HOT_WALLET_ADDRESS || '').trim();
  if (!hotWalletAddress) {
    throw new AppError('HOT_WALLET_ADDRESS is required', 500);
  }

  if (!validateTronAddress(hotWalletAddress)) {
    throw new AppError('Invalid HOT_WALLET_ADDRESS', 500);
  }

  try {
    const balanceInfo = await getUSDTBalance(hotWalletAddress);
    const balance = new Decimal(String(balanceInfo.balance || balanceInfo.formatted || '0'));
    const threshold = normalizeThreshold();
    const lowBalance = balance.lt(threshold);

    if (lowBalance) {
      console.warn('[hot-wallet-monitor] low USDT balance detected', {
        address: hotWalletAddress,
        balance: balance.toFixed(6),
        threshold: threshold.toFixed(6)
      });
    }

    return {
      address: hotWalletAddress,
      balance: balance.toFixed(6),
      threshold: threshold.toFixed(6),
      low_balance: lowBalance,
      token: 'USDT'
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(`Failed to check hot wallet balance: ${error.message}`, 502);
  }
};

const runMonitorSafely = async () => {
  try {
    await checkHotWallet();
  } catch (error) {
    console.error('[hot-wallet-monitor] check failed', {
      message: error.message
    });
  }
};

export const startHotWalletMonitor = () => {
  if (monitorState.started) {
    return false;
  }

  const intervalMs = parseInterval();
  monitorState.started = true;
  monitorState.timer = setInterval(runMonitorSafely, intervalMs);

  if (typeof monitorState.timer.unref === 'function') {
    monitorState.timer.unref();
  }

  void runMonitorSafely();
  return true;
};

export const stopHotWalletMonitor = () => {
  if (monitorState.timer) {
    clearInterval(monitorState.timer);
    monitorState.timer = null;
  }
  monitorState.started = false;
};

export const getHotWalletMonitorState = () => ({
  started: monitorState.started,
  interval_ms: parseInterval()
});

export default {
  checkHotWallet,
  startHotWalletMonitor,
  stopHotWalletMonitor,
  getHotWalletMonitorState
};
