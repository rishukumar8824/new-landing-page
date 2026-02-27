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

  return toAmount(walletDoc.lockedBalance);
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
    lockedBalance,
    totalBalance: toAmount(availableBalance + lockedBalance),
    createdAt: walletDoc.createdAt ? new Date(walletDoc.createdAt).toISOString() : null,
    updatedAt: walletDoc.updatedAt ? new Date(walletDoc.updatedAt).toISOString() : null
  };
}

module.exports = {
  toAmount,
  resolveAvailableBalance,
  resolveLockedBalance,
  computeTotalBalance,
  sanitizeWallet
};
