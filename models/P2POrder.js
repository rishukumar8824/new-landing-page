const ORDER_STATUS = {
  CREATED: 'created',
  PAYMENT_SENT: 'payment_sent',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const INTERNAL_TO_PUBLIC_STATUS = {
  CREATED: ORDER_STATUS.CREATED,
  PENDING: ORDER_STATUS.CREATED,
  PAYMENT_SENT: ORDER_STATUS.PAYMENT_SENT,
  PAID: ORDER_STATUS.PAYMENT_SENT,
  COMPLETED: ORDER_STATUS.COMPLETED,
  RELEASED: ORDER_STATUS.COMPLETED,
  CANCELLED: ORDER_STATUS.CANCELLED,
  EXPIRED: ORDER_STATUS.CANCELLED
};

function toAmount(value, precision = 8) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(precision));
}

function ensurePositiveNumber(value, fieldName) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
  return amount;
}

function ensureString(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function toPublicOrderStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return INTERNAL_TO_PUBLIC_STATUS[normalized] || ORDER_STATUS.CREATED;
}

function buildP2POrderDocument(input = {}) {
  const now = Date.now();
  const adId = ensureString(input.adId || input.offerId, 'adId');
  const buyerId = ensureString(input.buyerId || input.buyerUserId, 'buyerId');
  const sellerId = ensureString(input.sellerId || input.sellerUserId, 'sellerId');

  const price = ensurePositiveNumber(input.price, 'price');
  const cryptoAmount = ensurePositiveNumber(input.cryptoAmount || input.assetAmount, 'cryptoAmount');
  const fiatAmount = ensurePositiveNumber(input.fiatAmount || input.amountInr, 'fiatAmount');
  const expiresAt = Number(input.expiresAt || now + 15 * 60 * 1000);

  return {
    id: ensureString(input.id, 'id'),
    reference: ensureString(input.reference, 'reference'),
    adId,
    offerId: adId,
    buyerId,
    sellerId,
    buyerUserId: buyerId,
    sellerUserId: sellerId,
    buyerUsername: ensureString(input.buyerUsername || buyerId, 'buyerUsername'),
    sellerUsername: ensureString(input.sellerUsername || sellerId, 'sellerUsername'),
    side: String(input.side || '').trim().toLowerCase() || 'buy',
    asset: String(input.asset || 'USDT').trim().toUpperCase(),
    paymentMethod: ensureString(input.paymentMethod || 'UPI', 'paymentMethod'),
    price: toAmount(price, 8),
    cryptoAmount: toAmount(cryptoAmount, 8),
    assetAmount: toAmount(cryptoAmount, 8),
    escrowAmount: toAmount(cryptoAmount, 8),
    fiatAmount: toAmount(fiatAmount, 2),
    amountInr: toAmount(fiatAmount, 2),
    status: 'CREATED',
    expiresAt,
    createdAt: now,
    updatedAt: now,
    participants: Array.isArray(input.participants) ? input.participants : [],
    messages: Array.isArray(input.messages) ? input.messages : []
  };
}

function toOrderResponse(order) {
  const expiresAt = Number(order?.expiresAt || Date.now());
  return {
    success: true,
    orderId: String(order?.id || ''),
    status: toPublicOrderStatus(order?.status),
    expiresAt: new Date(expiresAt).toISOString()
  };
}

module.exports = {
  ORDER_STATUS,
  toPublicOrderStatus,
  buildP2POrderDocument,
  toOrderResponse
};

