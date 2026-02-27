const LEDGER_TYPES = [
  'deposit',
  'withdrawal',
  'trade_buy',
  'trade_sell',
  'fee',
  'refund',
  'admin_adjustment'
];

function normalizeLedgerType(type) {
  const normalized = String(type || '')
    .trim()
    .toLowerCase();

  if (LEDGER_TYPES.includes(normalized)) {
    return normalized;
  }

  throw new Error(`Invalid ledger type: ${type}`);
}

function buildLedgerEntry(payload = {}) {
  const now = payload.createdAt ? new Date(payload.createdAt) : new Date();
  return {
    userId: String(payload.userId || '').trim(),
    type: normalizeLedgerType(payload.type),
    amount: Number(payload.amount || 0),
    currency: String(payload.currency || 'USDT')
      .trim()
      .toUpperCase(),
    beforeAvailable: Number(payload.beforeAvailable || 0),
    afterAvailable: Number(payload.afterAvailable || 0),
    beforeLocked: Number(payload.beforeLocked || 0),
    afterLocked: Number(payload.afterLocked || 0),
    referenceId: String(payload.referenceId || '').trim(),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    createdAt: now
  };
}

module.exports = {
  LEDGER_TYPES,
  normalizeLedgerType,
  buildLedgerEntry
};
