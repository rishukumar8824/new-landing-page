function normalizeRole(role) {
  return String(role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function toDate(value, fallbackMs = 0) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallbackMs);
  }
  return parsed;
}

function buildRefreshTokenRecord(input = {}) {
  const userId = String(input.userId || '').trim();
  const tokenHash = String(input.tokenHash || '').trim();
  if (!userId || !tokenHash) {
    throw new Error('userId and tokenHash are required');
  }

  return {
    userId,
    role: normalizeRole(input.role),
    username: String(input.username || '').trim(),
    email: String(input.email || '')
      .trim()
      .toLowerCase(),
    tokenHash,
    issuedAt: toDate(input.issuedAt || Date.now(), Date.now()),
    expiresAt: toDate(input.expiresAt || Date.now(), Date.now())
  };
}

function toRefreshTokenResponse(doc) {
  if (!doc) {
    return null;
  }

  return {
    userId: String(doc.userId || '').trim(),
    role: normalizeRole(doc.role),
    username: String(doc.username || '').trim(),
    email: String(doc.email || '')
      .trim()
      .toLowerCase(),
    tokenHash: String(doc.tokenHash || '').trim(),
    issuedAt: toDate(doc.issuedAt, 0).toISOString(),
    expiresAt: toDate(doc.expiresAt, 0).toISOString()
  };
}

module.exports = {
  buildRefreshTokenRecord,
  toRefreshTokenResponse
};
