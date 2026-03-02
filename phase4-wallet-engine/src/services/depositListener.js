import Decimal from 'decimal.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Deposit, Wallet } from '../models/index.js';
import { toDecimal, toDbValue } from '../utils/decimal.js';
import { tronWebClient, USDT_TRC20_CONTRACT, validateTronAddress } from './tronService.js';

const TRONGRID_BASE_URL = 'https://api.trongrid.io';
const POLL_INTERVAL_MS = 30 * 1000;
const REQUIRED_CONFIRMATIONS = 20;
const USDT_DECIMALS = 6;
const EVENT_PAGE_LIMIT = Math.min(
  200,
  Math.max(1, Number.parseInt(String(process.env.TRON_DEPOSIT_SCAN_LIMIT || '200'), 10) || 200)
);
const INITIAL_LOOKBACK_MS = Math.max(
  POLL_INTERVAL_MS,
  Number.parseInt(String(process.env.TRON_DEPOSIT_INITIAL_LOOKBACK_MS || '1800000'), 10) || 1800000
);
const SCAN_OVERLAP_MS = Math.max(
  1000,
  Number.parseInt(String(process.env.TRON_DEPOSIT_SCAN_OVERLAP_MS || '120000'), 10) || 120000
);
const DB_LOCK_TIMEOUT_SECONDS = Math.max(
  1,
  Number.parseInt(String(process.env.TRON_DB_LOCK_TIMEOUT_SECONDS || '5'), 10) || 5
);

const CONFIRMED_STATUS = 'confirmed';
const CONFIRMED_STATUS_FALLBACK = 'approved';

const listenerState = {
  started: false,
  inProgress: false,
  timer: null,
  lastScanTimestamp: Date.now() - INITIAL_LOOKBACK_MS
};

const USDT_CONTRACT_HEX = (() => {
  try {
    return String(tronWebClient.address.toHex(USDT_TRC20_CONTRACT) || '')
      .trim()
      .toLowerCase()
      .replace(/^0x/, '');
  } catch {
    return '';
  }
})();

const buildTronGridHeaders = (asJson = false) => {
  const headers = {};
  const apiKey = String(process.env.TRONGRID_API_KEY || process.env.TRON_PRO_API_KEY || '').trim();
  if (apiKey) {
    headers['TRON-PRO-API-KEY'] = apiKey;
  }
  if (asJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const normalizeTronAddress = (value) => {
  const input = String(value || '').trim();
  if (!input) {
    return null;
  }

  if (validateTronAddress(input)) {
    return input;
  }

  const normalizedHex = input.replace(/^0x/i, '');
  if (/^41[0-9a-fA-F]{40}$/.test(normalizedHex)) {
    try {
      const converted = tronWebClient.address.fromHex(normalizedHex);
      return validateTronAddress(converted) ? converted : null;
    } catch {
      return null;
    }
  }

  return null;
};

const normalizeContractHex = (value) => {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  const hexInput = input.replace(/^0x/i, '');
  if (/^41[0-9a-fA-F]{40}$/.test(hexInput)) {
    return hexInput.toLowerCase();
  }

  if (validateTronAddress(input)) {
    try {
      return String(tronWebClient.address.toHex(input) || '')
        .trim()
        .toLowerCase()
        .replace(/^0x/, '');
    } catch {
      return '';
    }
  }

  return '';
};

const parseTransferEvent = (event) => {
  if (!event || event.removed === true) {
    return null;
  }

  const txHash = String(event.transaction_id || event.transaction || event.txID || '').trim();
  if (!txHash) {
    return null;
  }

  const contractHex = normalizeContractHex(event.contract_address || event.contractAddress);
  if (contractHex && USDT_CONTRACT_HEX && contractHex !== USDT_CONTRACT_HEX) {
    return null;
  }

  const result = event.result || {};
  const toAddress = normalizeTronAddress(result.to ?? result._to ?? result.recipient);
  if (!toAddress) {
    return null;
  }

  const amountRaw = String(result.value ?? result._value ?? '0').trim();
  if (!/^\d+$/.test(amountRaw)) {
    return null;
  }

  const blockNumber = Number(event.block_number || event.blockNumber || 0) || 0;
  const blockTimestamp = Number(event.block_timestamp || event.timestamp || 0) || 0;

  return {
    txHash,
    fromAddress: normalizeTronAddress(result.from ?? result._from ?? result.sender),
    toAddress,
    amountRaw,
    blockNumber,
    blockTimestamp
  };
};

const toUsdtAmount = (rawAmount) => {
  return new Decimal(String(rawAmount || '0')).div(new Decimal(10).pow(USDT_DECIMALS));
};

const readScalarFromRow = (row) => {
  if (!row || typeof row !== 'object') {
    return 0;
  }

  const firstValue = Object.values(row)[0];
  const numeric = Number(firstValue);
  return Number.isFinite(numeric) ? numeric : 0;
};

const acquireDbLock = async (lockKey, timeoutSeconds = DB_LOCK_TIMEOUT_SECONDS) => {
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

const isStatusConstraintError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('data truncated for column') ||
    message.includes('invalid input value for enum') ||
    message.includes('validation is in')
  );
};

const insertDepositRecord = async ({ userId, amount, txHash }, transaction) => {
  try {
    return await sequelize.query(
      'INSERT INTO deposits (user_id, coin, amount, tx_hash, status, created_at) VALUES (:userId, :coin, :amount, :txHash, :status, NOW())',
      {
        type: QueryTypes.INSERT,
        transaction,
        replacements: {
          userId,
          coin: 'USDT',
          amount,
          txHash,
          status: CONFIRMED_STATUS
        }
      }
    );
  } catch (error) {
    if (!isStatusConstraintError(error)) {
      throw error;
    }

    return sequelize.query(
      'INSERT INTO deposits (user_id, coin, amount, tx_hash, status, created_at) VALUES (:userId, :coin, :amount, :txHash, :status, NOW())',
      {
        type: QueryTypes.INSERT,
        transaction,
        replacements: {
          userId,
          coin: 'USDT',
          amount,
          txHash,
          status: CONFIRMED_STATUS_FALLBACK
        }
      }
    );
  }
};

const fetchCurrentBlockNumber = async () => {
  try {
    const response = await fetch(`${TRONGRID_BASE_URL}/wallet/getnowblock`, {
      method: 'POST',
      headers: buildTronGridHeaders(true),
      body: '{}'
    });

    if (!response.ok) {
      throw new Error(`TronGrid current block request failed (${response.status})`);
    }

    const payload = await response.json();
    const blockNumber = Number(payload?.block_header?.raw_data?.number || 0);
    if (!Number.isFinite(blockNumber) || blockNumber <= 0) {
      throw new Error('Invalid current block payload');
    }

    return blockNumber;
  } catch (error) {
    throw new Error(`Failed to fetch current TRON block: ${error.message}`);
  }
};

const fetchTransferEvents = async (minBlockTimestamp) => {
  const events = [];
  let fingerprint = '';
  let guard = 0;

  do {
    const params = new URLSearchParams({
      event_name: 'Transfer',
      only_confirmed: 'false',
      order_by: 'block_timestamp,asc',
      limit: String(EVENT_PAGE_LIMIT),
      min_block_timestamp: String(Math.max(0, minBlockTimestamp))
    });

    if (fingerprint) {
      params.set('fingerprint', fingerprint);
    }

    let payload;
    try {
      const response = await fetch(
        `${TRONGRID_BASE_URL}/v1/contracts/${USDT_TRC20_CONTRACT}/events?${params.toString()}`,
        {
          method: 'GET',
          headers: buildTronGridHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`TronGrid events request failed (${response.status})`);
      }

      payload = await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch TRC20 transfer events: ${error.message}`);
    }

    const batch = Array.isArray(payload?.data) ? payload.data : [];
    events.push(...batch);

    const nextFingerprint = String(payload?.meta?.fingerprint || '').trim();
    fingerprint = batch.length >= EVENT_PAGE_LIMIT && nextFingerprint ? nextFingerprint : '';

    guard += 1;
    if (guard >= 100) {
      break;
    }
  } while (fingerprint);

  return events;
};

const loadDepositAddressMap = async (addresses) => {
  if (!addresses.length) {
    return new Map();
  }

  const normalized = addresses.map((address) => address.toLowerCase());
  const rows = [];

  try {
    for (let index = 0; index < normalized.length; index += 500) {
      const chunk = normalized.slice(index, index + 500);
      const chunkRows = await sequelize.query(
        'SELECT user_id, address FROM deposit_addresses WHERE LOWER(address) IN (:addresses)',
        {
          type: QueryTypes.SELECT,
          replacements: { addresses: chunk }
        }
      );
      rows.push(...chunkRows);
    }
  } catch (error) {
    const code = String(error?.original?.code || error?.code || '').trim();
    if (code === 'ER_NO_SUCH_TABLE') {
      return new Map();
    }
    throw error;
  }

  const map = new Map();

  for (const row of rows) {
    const normalizedAddress = normalizeTronAddress(row.address);
    if (!normalizedAddress) {
      continue;
    }

    map.set(normalizedAddress.toLowerCase(), {
      userId: Number.parseInt(String(row.user_id), 10),
      address: normalizedAddress
    });
  }

  return map;
};

const verifyTransferFinality = async (transfer, currentBlockNumber) => {
  if (!transfer.blockNumber || transfer.blockNumber <= 0) {
    return { ok: false, reason: 'invalid_block_number' };
  }

  const confirmations = currentBlockNumber - transfer.blockNumber + 1;
  if (confirmations < REQUIRED_CONFIRMATIONS) {
    return { ok: false, reason: 'insufficient_confirmations', confirmations };
  }

  try {
    const txInfo = await tronWebClient.trx.getTransactionInfo(transfer.txHash);
    if (!txInfo || Object.keys(txInfo).length === 0) {
      return { ok: false, reason: 'tx_info_not_available' };
    }

    const receiptResult = String(txInfo?.receipt?.result || '').trim().toUpperCase();
    if (receiptResult && receiptResult !== 'SUCCESS') {
      return { ok: false, reason: 'tx_receipt_failed', confirmations };
    }

    const chainBlockNumber = Number(txInfo?.blockNumber || transfer.blockNumber || 0) || 0;
    if (chainBlockNumber <= 0) {
      return { ok: false, reason: 'missing_chain_block' };
    }

    const chainConfirmations = currentBlockNumber - chainBlockNumber + 1;
    if (chainConfirmations < REQUIRED_CONFIRMATIONS) {
      return { ok: false, reason: 'insufficient_chain_confirmations', confirmations: chainConfirmations };
    }

    return {
      ok: true,
      confirmations: chainConfirmations,
      blockNumber: chainBlockNumber
    };
  } catch (error) {
    return { ok: false, reason: `tx_info_error:${error.message}` };
  }
};

const processTransferCredit = async (transfer, depositAddress) => {
  const lockKey = `deposit_credit_${transfer.txHash}`;
  const lockAcquired = await acquireDbLock(lockKey, DB_LOCK_TIMEOUT_SECONDS);
  if (!lockAcquired) {
    return { status: 'skipped_lock' };
  }

  try {
    return sequelize.transaction(async (transaction) => {
      const existingDeposit = await Deposit.findOne({
        where: { tx_hash: transfer.txHash },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existingDeposit) {
        return { status: 'duplicate' };
      }

      const amountDecimal = toUsdtAmount(transfer.amountRaw);
      if (!amountDecimal.isFinite() || amountDecimal.lte(0)) {
        return { status: 'invalid_amount' };
      }

      const [wallet] = await Wallet.findOrCreate({
        where: { user_id: depositAddress.userId, coin: 'USDT' },
        defaults: {
          user_id: depositAddress.userId,
          coin: 'USDT',
          available_balance: '0.00000000',
          locked_balance: '0.00000000'
        },
        transaction
      });

      const lockedWallet = await Wallet.findOne({
        where: { id: wallet.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!lockedWallet) {
        throw new Error('Wallet lock failed');
      }

      const nextAvailable = toDecimal(lockedWallet.available_balance).plus(amountDecimal);
      if (nextAvailable.lt(0)) {
        throw new Error('Invalid wallet balance state');
      }

      lockedWallet.available_balance = toDbValue(nextAvailable);
      await lockedWallet.save({ transaction });

      await insertDepositRecord(
        {
          userId: depositAddress.userId,
          amount: toDbValue(amountDecimal),
          txHash: transfer.txHash
        },
        transaction
      );

      return {
        status: 'credited',
        userId: depositAddress.userId,
        txHash: transfer.txHash,
        amount: toDbValue(amountDecimal)
      };
    });
  } finally {
    await releaseDbLock(lockKey);
  }
};

export const scanDeposits = async () => {
  if (listenerState.inProgress) {
    return {
      running: true,
      scanned: 0,
      matched: 0,
      credited: 0,
      duplicates: 0,
      skipped: 0,
      errors: 0,
      lastScanTimestamp: listenerState.lastScanTimestamp
    };
  }

  listenerState.inProgress = true;

  const summary = {
    running: true,
    scanned: 0,
    matched: 0,
    credited: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
    lastScanTimestamp: listenerState.lastScanTimestamp
  };

  try {
    const minTimestamp = Math.max(0, listenerState.lastScanTimestamp - SCAN_OVERLAP_MS);
    const currentBlockNumber = await fetchCurrentBlockNumber();
    const eventRows = await fetchTransferEvents(minTimestamp);
    const parsedTransfers = eventRows.map(parseTransferEvent).filter(Boolean);

    const maxTimestamp = parsedTransfers.reduce(
      (max, transfer) => (transfer.blockTimestamp > max ? transfer.blockTimestamp : max),
      listenerState.lastScanTimestamp
    );
    if (maxTimestamp > listenerState.lastScanTimestamp) {
      listenerState.lastScanTimestamp = maxTimestamp;
    }

    if (!parsedTransfers.length) {
      summary.lastScanTimestamp = listenerState.lastScanTimestamp;
      return summary;
    }

    const deduped = new Map();
    for (const transfer of parsedTransfers) {
      if (!deduped.has(transfer.txHash)) {
        deduped.set(transfer.txHash, transfer);
      }
    }

    const uniqueTransfers = [...deduped.values()].sort(
      (a, b) => a.blockNumber - b.blockNumber || a.blockTimestamp - b.blockTimestamp
    );

    summary.scanned = uniqueTransfers.length;

    const finalizedTransfers = [];
    for (const transfer of uniqueTransfers) {
      const verification = await verifyTransferFinality(transfer, currentBlockNumber);
      if (!verification.ok) {
        summary.skipped += 1;
        continue;
      }

      finalizedTransfers.push({
        ...transfer,
        blockNumber: verification.blockNumber || transfer.blockNumber,
        confirmations: verification.confirmations
      });
    }

    if (!finalizedTransfers.length) {
      summary.lastScanTimestamp = listenerState.lastScanTimestamp;
      return summary;
    }

    const candidateAddresses = [...new Set(finalizedTransfers.map((transfer) => transfer.toAddress))];
    const addressMap = await loadDepositAddressMap(candidateAddresses);

    for (const transfer of finalizedTransfers) {
      const mapping = addressMap.get(transfer.toAddress.toLowerCase());
      if (!mapping || !Number.isInteger(mapping.userId) || mapping.userId <= 0) {
        continue;
      }

      summary.matched += 1;

      try {
        const result = await processTransferCredit(transfer, mapping);
        if (result.status === 'credited') {
          summary.credited += 1;
          console.log('[deposit-listener] credited confirmed USDT deposit', {
            userId: result.userId,
            txHash: result.txHash,
            amount: result.amount,
            confirmations: transfer.confirmations
          });
        } else if (result.status === 'duplicate') {
          summary.duplicates += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        summary.errors += 1;
        console.error('[deposit-listener] failed to process transfer', {
          txHash: transfer.txHash,
          message: error.message
        });
      }
    }

    summary.lastScanTimestamp = listenerState.lastScanTimestamp;
    return summary;
  } catch (error) {
    summary.errors += 1;
    summary.lastScanTimestamp = listenerState.lastScanTimestamp;
    console.error('[deposit-listener] scan failed', {
      message: error.message
    });
    return summary;
  } finally {
    listenerState.inProgress = false;
  }
};

const scanSafely = async () => {
  try {
    await scanDeposits();
  } catch (error) {
    console.error('[deposit-listener] unexpected scan error', {
      message: error.message
    });
  }
};

export const startDepositListener = () => {
  if (listenerState.started) {
    return false;
  }

  listenerState.started = true;
  listenerState.timer = setInterval(scanSafely, POLL_INTERVAL_MS);
  if (typeof listenerState.timer.unref === 'function') {
    listenerState.timer.unref();
  }

  void scanSafely();
  return true;
};

export const stopDepositListener = () => {
  if (listenerState.timer) {
    clearInterval(listenerState.timer);
    listenerState.timer = null;
  }
  listenerState.started = false;
};

export const getDepositListenerState = () => ({
  started: listenerState.started,
  inProgress: listenerState.inProgress,
  pollIntervalMs: POLL_INTERVAL_MS,
  requiredConfirmations: REQUIRED_CONFIRMATIONS,
  lastScanTimestamp: listenerState.lastScanTimestamp
});

if (String(process.env.TRON_DEPOSIT_LISTENER_AUTOSTART || 'true').trim().toLowerCase() !== 'false') {
  startDepositListener();
}
