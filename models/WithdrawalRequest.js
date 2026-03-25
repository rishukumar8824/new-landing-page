const WITHDRAWAL_STATUSES = ['pending', 'approved', 'rejected', 'sent'];

function normalizeWithdrawalStatus(status) {
  const normalized = String(status || 'pending').trim().toLowerCase();
  if (WITHDRAWAL_STATUSES.includes(normalized)) {
    return normalized;
  }
  throw new Error(`Invalid withdrawal status: ${status}`);
}

function buildWithdrawalRequest(input = {}) {
  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  const processedAt = input.processedAt ? new Date(input.processedAt) : null;
  const amount = Number(input.amount || 0);

  return {
    requestId: String(input.requestId || '').trim(),
    userId: String(input.userId || '').trim(),
    amount: Number.isFinite(amount) ? Number(amount.toFixed(8)) : 0,
    currency: String(input.currency || 'USDT')
      .trim()
      .toUpperCase(),
    address: String(input.address || '').trim(),
    status: normalizeWithdrawalStatus(input.status || 'pending'),
    createdAt,
    processedAt,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function toWithdrawalResponse(doc) {
  if (!doc) {
    return null;
  }

  return {
    requestId: String(doc.requestId || '').trim(),
    userId: String(doc.userId || '').trim(),
    amount: Number(doc.amount || 0),
    currency: String(doc.currency || '').trim().toUpperCase(),
    address: String(doc.address || '').trim(),
    status: normalizeWithdrawalStatus(doc.status || 'pending'),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    processedAt: doc.processedAt ? new Date(doc.processedAt).toISOString() : null,
    metadata: doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {}
  };
}

module.exports = {
  WITHDRAWAL_STATUSES,
  normalizeWithdrawalStatus,
  buildWithdrawalRequest,
  toWithdrawalResponse
};
