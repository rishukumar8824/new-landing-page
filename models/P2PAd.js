const SUPPORTED_P2P_ASSETS = ['USDT', 'BTC', 'ETH'];

function toAmount(value, precision = 8) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(precision));
}

function normalizeP2PAsset(rawAsset) {
  const asset = String(rawAsset || '')
    .trim()
    .toUpperCase();
  if (!SUPPORTED_P2P_ASSETS.includes(asset)) {
    throw new Error('Asset must be USDT, BTC or ETH.');
  }
  return asset;
}

function normalizeAdType(rawAdType) {
  const adType = String(rawAdType || '')
    .trim()
    .toLowerCase();
  if (!['buy', 'sell'].includes(adType)) {
    throw new Error('adType must be either buy or sell.');
  }
  return adType;
}

function normalizeActionSideFromAdType(adType) {
  return adType === 'sell' ? 'buy' : 'sell';
}

function normalizePaymentMethods(rawPayments) {
  if (!Array.isArray(rawPayments)) {
    return [];
  }
  return rawPayments
    .map((method) => String(method || '').trim())
    .filter((method) => method.length > 0)
    .slice(0, 4);
}

function normalizeAdPricing({ asset, price, availableAmount, minLimit, maxLimit }) {
  const normalizedPrice = Number(price);
  const normalizedAvailable = Number(availableAmount);
  const normalizedMin = Number(minLimit);
  const normalizedMax = Number(maxLimit);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    throw new Error('Price must be greater than 0.');
  }
  if (!Number.isFinite(normalizedAvailable) || normalizedAvailable <= 0) {
    throw new Error('availableAmount must be greater than 0.');
  }
  if (!Number.isFinite(normalizedMin) || !Number.isFinite(normalizedMax) || normalizedMin <= 0 || normalizedMax < normalizedMin) {
    throw new Error('minLimit must be <= maxLimit and both must be valid positive numbers.');
  }

  return {
    price: toAmount(normalizedPrice, asset === 'USDT' ? 2 : 8),
    availableAmount: toAmount(normalizedAvailable, asset === 'USDT' ? 2 : 8),
    minLimit: toAmount(normalizedMin, 2),
    maxLimit: toAmount(normalizedMax, 2)
  };
}

function normalizeP2PAdPayload(payload = {}) {
  const asset = normalizeP2PAsset(payload.asset);
  const adType = normalizeAdType(payload.adType || 'sell');
  const side = normalizeActionSideFromAdType(adType);
  const payments = normalizePaymentMethods(payload.payments);
  if (payments.length === 0) {
    throw new Error('Add at least one payment method.');
  }

  const pricing = normalizeAdPricing({
    asset,
    price: payload.price,
    availableAmount: payload.availableAmount ?? payload.available,
    minLimit: payload.minLimit,
    maxLimit: payload.maxLimit
  });

  return {
    asset,
    adType,
    side,
    payments,
    ...pricing
  };
}

function buildP2PAdDocument(input = {}) {
  const now = new Date();
  const availableAmount = toAmount(input.availableAmount, 8);

  return {
    id: String(input.id || '').trim(),
    side: String(input.side || 'buy').trim().toLowerCase(),
    adType: String(input.adType || 'sell').trim().toLowerCase(),
    asset: String(input.asset || 'USDT').trim().toUpperCase(),
    advertiser: String(input.advertiser || '').trim(),
    price: toAmount(input.price, 8),
    availableAmount,
    // Keep legacy field for existing frontend compatibility.
    available: availableAmount,
    escrowLockedAmount: availableAmount,
    minLimit: toAmount(input.minLimit, 2),
    maxLimit: toAmount(input.maxLimit, 2),
    completionRate: toAmount(input.completionRate ?? 100, 2),
    orders: Number(input.orders || 0),
    payments: Array.isArray(input.payments) ? input.payments : [],
    createdByUserId: String(input.createdByUserId || '').trim(),
    createdByUsername: String(input.createdByUsername || '').trim(),
    createdByEmail: String(input.createdByEmail || '').trim().toLowerCase(),
    status: 'active',
    moderationStatus: 'APPROVED',
    merchantDepositLocked: true,
    isDemo: false,
    environment: 'production',
    fundingSource: 'ad_locked',
    createdAt: now,
    updatedAt: now
  };
}

function isDemoAd(offer = {}) {
  return offer.isDemo === true || String(offer.environment || '').trim().toLowerCase() === 'demo';
}

module.exports = {
  SUPPORTED_P2P_ASSETS,
  normalizeP2PAdPayload,
  buildP2PAdDocument,
  isDemoAd
};
