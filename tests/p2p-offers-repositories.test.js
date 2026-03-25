const test = require('node:test');
const assert = require('node:assert/strict');

const { createRepositories } = require('../lib/repositories');

function createCollections(overrides = {}) {
  const empty = {};
  return {
    leads: empty,
    adminSessions: empty,
    refreshTokens: empty,
    signupOtps: empty,
    p2pCredentials: empty,
    p2pKycRequests: empty,
    p2pUserSessions: empty,
    wallets: empty,
    ledgerEntries: empty,
    walletFailures: empty,
    withdrawalRequests: empty,
    auditLogs: empty,
    p2pOffers: empty,
    p2pOrders: empty,
    tradeOrders: empty,
    appMeta: empty,
    counters: empty,
    ...overrides
  };
}

test('listOffers pushes payment/advertiser/amount filtering and sorting into Mongo query', async () => {
  const calls = {};
  const repos = createRepositories(
    createCollections({
      p2pOffers: {
        find(query, options) {
          calls.query = query;
          calls.options = options;
          return {
            sort(sortSpec) {
              calls.sort = sortSpec;
              return this;
            },
            limit(limitValue) {
              calls.limit = limitValue;
              return this;
            },
            async toArray() {
              return [
                {
                  _id: 'mongo_id',
                  id: 'ad_1',
                  advertiser: 'alice',
                  price: 90,
                  payments: ['UPI'],
                  createdByUserId: 'user_1'
                }
              ];
            }
          };
        }
      }
    })
  );

  const offers = await repos.listOffers({
    side: 'buy',
    asset: 'USDT',
    payment: 'upi',
    advertiser: 'ali',
    amount: 1200,
    activeOnly: true,
    merchantDepositLocked: true,
    availableOnly: true,
    excludeDemo: true,
    escrowBackedOnly: true,
    merchantOwnedOnly: true,
    limit: 40
  });

  assert.equal(calls.query.side, 'buy');
  assert.equal(calls.query.asset, 'USDT');
  assert.equal(calls.query.status, 'ACTIVE');
  assert.equal(calls.query.payments.$elemMatch.$options, 'i');
  assert.equal(calls.query.advertiser.$options, 'i');
  assert.match(String(calls.query.payments.$elemMatch.$regex), /upi/i);
  assert.match(String(calls.query.advertiser.$regex), /ali/i);
  assert.deepEqual(calls.sort, { price: 1, updatedAt: -1 });
  assert.equal(calls.limit, 40);
  assert.ok(Array.isArray(calls.query.$and));
  assert.ok(calls.query.$and.some((entry) => entry.minLimit && entry.minLimit.$lte === 1200));
  assert.ok(calls.query.$and.some((entry) => entry.maxLimit && entry.maxLimit.$gte === 1200));
  assert.equal(offers[0]._id, undefined);
});
