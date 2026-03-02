import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { tronWebClient, USDT_TRC20_CONTRACT, validateTronAddress } from './tronService.js';

const TRANSFER_EVENT_NAME = 'Transfer';
const USDT_DECIMALS = 6;
const SCAN_BATCH_SIZE = Number.parseInt(String(process.env.TRON_DEPOSIT_SCAN_LIMIT || '200'), 10) || 200;

let lastScanTimestamp = 0;

const formatUsdtAmount = (rawValue) => {
  const value = BigInt(String(rawValue || '0'));
  const base = 10n ** BigInt(USDT_DECIMALS);
  const whole = value / base;
  const fraction = value % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(USDT_DECIMALS, '0');
  return `${whole.toString()}.${padded.replace(/0+$/, '')}`;
};

const normalizeAddress = (value) => {
  const input = String(value || '').trim();
  if (!input) {
    return null;
  }

  if (validateTronAddress(input)) {
    return input;
  }

  const hex = input.startsWith('0x') ? input.slice(2) : input;
  if (/^41[0-9a-fA-F]{40}$/.test(hex)) {
    try {
      const converted = tronWebClient.address.fromHex(hex);
      return validateTronAddress(converted) ? converted : null;
    } catch {
      return null;
    }
  }

  return null;
};

const isConfirmedTransfer = (event) => {
  if (event?.confirmed === true) {
    return true;
  }

  if (event?._unconfirmed === false) {
    return true;
  }

  const resourceNode = String(event?.resourceNode || '').toLowerCase();
  return resourceNode === 'soliditynode';
};

const parseTransferEvent = (event) => {
  const result = event?.result || {};
  const toAddress = normalizeAddress(result.to ?? result._to ?? result.recipient);
  if (!toAddress) {
    return null;
  }

  return {
    txHash: String(event?.transaction_id || event?.txID || event?.transaction || '').trim(),
    fromAddress: normalizeAddress(result.from ?? result._from ?? result.sender),
    toAddress,
    amountRaw: String(result.value ?? result._value ?? '0'),
    blockTimestamp: Number(event?.block_timestamp || event?.timestamp || 0) || 0,
    blockNumber: Number(event?.block_number || 0) || null,
    confirmed: isConfirmedTransfer(event)
  };
};

const fetchTransferEvents = async () => {
  const options = {
    eventName: TRANSFER_EVENT_NAME,
    onlyConfirmed: false,
    orderBy: 'block_timestamp,asc',
    size: SCAN_BATCH_SIZE
  };

  if (lastScanTimestamp > 0) {
    options.minBlockTimestamp = lastScanTimestamp + 1;
  }

  const events = await tronWebClient.getEventResult(USDT_TRC20_CONTRACT, options);
  return Array.isArray(events) ? events : [];
};

const loadDepositAddressMap = async (addresses) => {
  if (!addresses.length) {
    return new Map();
  }

  try {
    const rows = await sequelize.query(
      'SELECT user_id, address FROM deposit_addresses WHERE LOWER(address) IN (:addresses)',
      {
        type: QueryTypes.SELECT,
        replacements: { addresses: addresses.map((address) => address.toLowerCase()) }
      }
    );

    const map = new Map();
    for (const row of rows) {
      const normalized = normalizeAddress(row.address);
      if (!normalized) {
        continue;
      }

      map.set(normalized.toLowerCase(), {
        userId: row.user_id,
        address: normalized
      });
    }

    return map;
  } catch (error) {
    const code = String(error?.original?.code || error?.code || '').trim();
    if (code === 'ER_NO_SUCH_TABLE') {
      console.warn('[deposit-listener] deposit_addresses table not found, skipping scan');
      return new Map();
    }

    throw error;
  }
};

export const scanDeposits = async () => {
  const events = await fetchTransferEvents();
  if (!events.length) {
    return {
      scanned: 0,
      matched: 0,
      logged: 0,
      autoCredit: false
    };
  }

  const parsedTransfers = events.map(parseTransferEvent).filter(Boolean);
  if (!parsedTransfers.length) {
    return {
      scanned: 0,
      matched: 0,
      logged: 0,
      autoCredit: false
    };
  }

  const addresses = [...new Set(parsedTransfers.map((transfer) => transfer.toAddress))];
  const addressMap = await loadDepositAddressMap(addresses);

  let matched = 0;
  let logged = 0;

  for (const transfer of parsedTransfers) {
    const mapping = addressMap.get(transfer.toAddress.toLowerCase());
    if (!mapping) {
      continue;
    }

    matched += 1;

    const payload = {
      userId: mapping.userId,
      depositAddress: mapping.address,
      txHash: transfer.txHash,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      amountRaw: transfer.amountRaw,
      amount: formatUsdtAmount(transfer.amountRaw),
      blockNumber: transfer.blockNumber,
      blockTimestamp: transfer.blockTimestamp,
      confirmed: transfer.confirmed,
      action: 'log_only_manual_review_no_auto_credit'
    };

    if (!transfer.confirmed) {
      console.log('[deposit-listener] matched unconfirmed USDT transfer', payload);
      logged += 1;
      continue;
    }

    console.log('[deposit-listener] matched confirmed USDT transfer (safe mode)', payload);
    logged += 1;
  }

  const highestTimestamp = parsedTransfers.reduce(
    (max, transfer) => (transfer.blockTimestamp > max ? transfer.blockTimestamp : max),
    lastScanTimestamp
  );
  if (highestTimestamp > lastScanTimestamp) {
    lastScanTimestamp = highestTimestamp;
  }

  return {
    scanned: parsedTransfers.length,
    matched,
    logged,
    autoCredit: false,
    lastScanTimestamp
  };
};
