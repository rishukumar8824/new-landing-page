const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createP2PRealtimeHub } = require('../lib/p2p-realtime');

function createReq() {
  return new EventEmitter();
}

function createRes() {
  return {
    headers: new Map(),
    chunks: [],
    writableEnded: false,
    destroyed: false,
    setHeader(name, value) {
      this.headers.set(name, value);
    },
    flushHeaders() {},
    write(chunk) {
      this.chunks.push(String(chunk));
    }
  };
}

test('publishOrderSnapshot fans out to buyer, seller, and order streams immediately', async () => {
  const hub = createP2PRealtimeHub();
  const buyerReq = createReq();
  const sellerReq = createReq();
  const orderReq = createReq();
  const buyerRes = createRes();
  const sellerRes = createRes();
  const orderRes = createRes();

  hub.attachUserStream(buyerReq, buyerRes, 'buyer_1');
  hub.attachUserStream(sellerReq, sellerRes, 'seller_1');
  hub.attachOrderStream(orderReq, orderRes, 'ord_1');

  hub.publishOrderSnapshot({
    id: 'ord_1',
    status: 'CREATED',
    buyerUserId: 'buyer_1',
    sellerUserId: 'seller_1',
    participants: [
      { id: 'buyer_1', role: 'buyer' },
      { id: 'seller_1', role: 'seller' }
    ],
    messages: [{ id: 'msg_1', text: 'created' }],
    updatedAt: new Date().toISOString()
  });

  const buyerPayload = buyerRes.chunks.join('');
  const sellerPayload = sellerRes.chunks.join('');
  const orderPayload = orderRes.chunks.join('');

  assert.match(buyerPayload, /event: orders_refresh/);
  assert.match(sellerPayload, /event: orders_refresh/);
  assert.match(orderPayload, /event: order_update/);
  assert.match(orderPayload, /event: message_update/);

  buyerReq.emit('close');
  sellerReq.emit('close');
  orderReq.emit('close');
  await hub.close();
});
