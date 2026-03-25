const test = require('node:test');
const assert = require('node:assert/strict');

const { createWalletService } = require('../lib/wallet-service');

function createMongoClient() {
  return {
    startSession() {
      return {
        async withTransaction(work) {
          await work();
        },
        async endSession() {}
      };
    }
  };
}

function createBaseCollections(overrides = {}) {
  const walletDocByUserId = {
    seller_1: {
      userId: 'seller_1',
      username: 'seller_1',
      availableBalance: 0,
      balance: 0,
      p2pLocked: 10,
      lockedBalance: 10,
      merchantDepositLocked: true
    },
    buyer_1: {
      userId: 'buyer_1',
      username: 'buyer_1',
      availableBalance: 0,
      balance: 0,
      p2pLocked: 0,
      lockedBalance: 0,
      merchantDepositLocked: false
    }
  };

  const defaults = {
    wallets: {
      async findOne(query) {
        return walletDocByUserId[query.userId] || null;
      },
      async updateOne() {}
    },
    p2pOffers: {
      async findOne() {
        return {
          _id: 'mongo_offer_1',
          id: 'ad_1',
          status: 'ACTIVE',
          merchantDepositLocked: true,
          isDemo: false,
          environment: 'production',
          fundingSource: 'ad_locked',
          createdByUserId: 'seller_1',
          availableAmount: 5,
          available: 5
        };
      },
      async updateOne() {
        return { modifiedCount: 1 };
      }
    },
    p2pCredentials: {},
    ledgerEntries: {},
    walletFailures: {
      async insertOne() {}
    },
    withdrawalRequests: {},
    p2pOrders: {
      async findOne() {
        return null;
      },
      async insertOne() {}
    }
  };

  return { ...defaults, ...overrides };
}

function createOrderInput(overrides = {}) {
  return {
    id: 'ord_1',
    reference: 'P2P-123456',
    adId: 'ad_1',
    offerId: 'ad_1',
    sellerUserId: 'seller_1',
    sellerUsername: 'seller_1',
    buyerUserId: 'buyer_1',
    buyerUsername: 'buyer_1',
    asset: 'USDT',
    type: 'SELL',
    side: 'buy',
    paymentMethod: 'UPI',
    price: 90,
    assetAmount: 1,
    amountInr: 90,
    idempotencyKey: 'idem_1',
    participants: [
      { id: 'buyer_1', role: 'buyer' },
      { id: 'seller_1', role: 'seller' }
    ],
    messages: []
  };
}

test('createEscrowOrder returns the same order for idempotent retries before touching the offer', async () => {
  let offerReads = 0;
  const existingOrder = {
    id: 'ord_existing',
    buyerUserId: 'buyer_1',
    sellerUserId: 'seller_1',
    idempotencyKey: 'idem_1',
    status: 'CREATED'
  };

  const walletService = createWalletService(
    createBaseCollections({
      p2pOffers: {
        async findOne() {
          offerReads += 1;
          return null;
        }
      },
      p2pOrders: {
        async findOne(query) {
          if (query.buyerUserId === 'buyer_1' && query.idempotencyKey === 'idem_1') {
            return existingOrder;
          }
          return null;
        },
        async insertOne() {
          throw new Error('insertOne should not run for idempotent replay');
        }
      }
    }),
    createMongoClient()
  );

  const order = await walletService.createEscrowOrder(createOrderInput());
  assert.equal(order.id, 'ord_existing');
  assert.equal(order.duplicateOfExisting, true);
  assert.equal(order.duplicateReason, 'idempotency_replay');
  assert.equal(offerReads, 0);
});

test('createEscrowOrder resolves duplicate-key races by returning the existing active order', async () => {
  let idempotencyLookups = 0;
  let insertCalls = 0;
  const existingOrder = {
    id: 'ord_existing_after_race',
    buyerUserId: 'buyer_1',
    sellerUserId: 'seller_1',
    idempotencyKey: 'idem_1',
    status: 'CREATED'
  };

  const walletService = createWalletService(
    createBaseCollections({
      p2pOrders: {
        async findOne(query) {
          if (query.buyerUserId === 'buyer_1' && query.idempotencyKey === 'idem_1') {
            idempotencyLookups += 1;
            return idempotencyLookups >= 3 ? existingOrder : null;
          }
          return null;
        },
        async insertOne() {
          insertCalls += 1;
          const error = new Error('duplicate key');
          error.code = 11000;
          throw error;
        }
      }
    }),
    createMongoClient()
  );

  const order = await walletService.createEscrowOrder(createOrderInput());
  assert.equal(insertCalls, 1);
  assert.equal(order.id, 'ord_existing_after_race');
  assert.equal(order.duplicateOfExisting, true);
  assert.equal(order.duplicateReason, 'idempotency_replay');
});
