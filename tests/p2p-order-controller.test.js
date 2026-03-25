const test = require('node:test');
const assert = require('node:assert/strict');

const { createP2POrderController } = require('../controllers/p2p-order-controller');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createBaseReq() {
  return {
    body: {
      offerId: 'ad_1',
      amountInr: 1000,
      paymentMethod: 'UPI'
    },
    p2pUser: {
      id: 'buyer_1',
      username: 'buyer_1',
      email: 'buyer_1@example.com'
    },
    get(name) {
      return String(name || '').toLowerCase() === 'x-idempotency-key' ? 'idem_123' : '';
    }
  };
}

function createOffer() {
  return {
    id: 'ad_1',
    type: 'SELL',
    asset: 'USDT',
    advertiser: 'merchant_one',
    createdByUserId: 'seller_1',
    createdByUsername: 'seller_1',
    price: 90,
    minLimit: 500,
    maxLimit: 5000,
    availableAmount: 250,
    payments: ['UPI'],
    status: 'ACTIVE',
    fundingSource: 'ad_locked',
    merchantDepositLocked: true,
    isDemo: false,
    environment: 'production'
  };
}

test('createOrder returns immediate chat-ready order payload and emits realtime', async () => {
  const publishCalls = [];
  let capturedOrderInput = null;
  const controller = createP2POrderController({
    repos: {
      async getOfferById() {
        return createOffer();
      },
      async getP2PCredential() {
        return { kycStatus: 'VERIFIED' };
      }
    },
    walletService: {
      async createEscrowOrder(orderInput) {
        capturedOrderInput = orderInput;
        return { ...orderInput, chatThreadId: orderInput.id, chatReady: true };
      }
    },
    realtime: {
      publishOrderSnapshot(order) {
        publishCalls.push(order.id);
      }
    },
    logger: { info() {}, warn() {} }
  });

  const res = createMockRes();
  await controller.createOrder(createBaseReq(), res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message, 'Order created successfully. Chat is live now.');
  assert.equal(res.body.order.chatThreadId, res.body.order.id);
  assert.equal(res.body.chatReady, true);
  assert.equal(capturedOrderInput.idempotencyKey, 'idem_123');
  assert.deepEqual(publishCalls, [res.body.order.id]);
});

test('createOrder resumes existing active order deterministically on replay', async () => {
  const controller = createP2POrderController({
    repos: {
      async getOfferById() {
        return createOffer();
      },
      async getP2PCredential() {
        return { kycStatus: 'VERIFIED' };
      }
    },
    walletService: {
      async createEscrowOrder(orderInput) {
        return {
          ...orderInput,
          id: 'ord_existing',
          reference: 'P2P-EXISTING',
          duplicateOfExisting: true,
          duplicateReason: 'idempotency_replay',
          chatThreadId: 'ord_existing',
          chatReady: true
        };
      }
    },
    realtime: {
      publishOrderSnapshot() {}
    },
    logger: { info() {}, warn() {} }
  });

  const res = createMockRes();
  await controller.createOrder(createBaseReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.duplicate, true);
  assert.equal(res.body.order.id, 'ord_existing');
  assert.equal(res.body.message, 'Existing active order resumed.');
});
