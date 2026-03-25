function toAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(8));
}

function resolveAvailableBalance(walletDoc) {
  if (!walletDoc) {
    return 0;
  }

  if (walletDoc.availableBalance !== undefined && walletDoc.availableBalance !== null) {
    return toAmount(walletDoc.availableBalance);
  }

  return toAmount(walletDoc.balance);
}

function resolveLockedBalance(walletDoc) {
  if (!walletDoc) {
    return 0;
  }

  if (walletDoc.p2pLocked !== undefined && walletDoc.p2pLocked !== null) {
    return toAmount(walletDoc.p2pLocked);
  }

  return toAmount(walletDoc.lockedBalance);
}

function resolveMerchantDepositLocked(walletDoc) {
  if (!walletDoc) {
    return false;
  }
  return Boolean(walletDoc.merchantDepositLocked);
}

function computeTotalBalance(walletDoc) {
  return toAmount(resolveAvailableBalance(walletDoc) + resolveLockedBalance(walletDoc));
}

function sanitizeWallet(walletDoc) {
  if (!walletDoc) {
    return null;
  }

  const availableBalance = resolveAvailableBalance(walletDoc);
  const lockedBalance = resolveLockedBalance(walletDoc);

  return {
    userId: String(walletDoc.userId || '').trim(),
    username: String(walletDoc.username || '').trim(),
    availableBalance,
    balance: availableBalance,
    p2pLocked: lockedBalance,
    lockedBalance,
    merchantDepositLocked: resolveMerchantDepositLocked(walletDoc),
    totalBalance: toAmount(availableBalance + lockedBalance),
    createdAt: walletDoc.createdAt ? new Date(walletDoc.createdAt).toISOString() : null,
    updatedAt: walletDoc.updatedAt ? new Date(walletDoc.updatedAt).toISOString() : null
  };
}

module.exports = {
  toAmount,
  resolveAvailableBalance,
  resolveLockedBalance,
  resolveMerchantDepositLocked,
  computeTotalBalance,
  sanitizeWallet
};
