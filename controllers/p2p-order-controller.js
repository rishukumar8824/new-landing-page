const { buildP2POrderDocument, toOrderResponse } = require('../models/P2POrder');
const { makeSeedUserId } = require('../lib/wallet-service');

function createOrderReference() {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `P2P-${Date.now().toString().slice(-6)}-${randomPart}`;
}

function normalizeOfferAvailableAmount(offer = {}) {
  const candidate = Number(offer.availableAmount ?? offer.available ?? 0);
  if (!Number.isFinite(candidate)) {
    return 0;
  }
  return Number(candidate.toFixed(8));
}

function resolveOfferOwner(offer = {}) {
  const ownerId = String(offer.createdByUserId || '').trim() || makeSeedUserId(offer.advertiser);
  const ownerUsername = String(offer.createdByUsername || offer.advertiser || ownerId).trim();
  return {
    id: ownerId,
    username: ownerUsername
  };
}

function buildOrderParticipants({ buyerId, buyerUsername, sellerId, sellerUsername }) {
  return [
    { id: buyerId, username: buyerUsername, role: 'buyer' },
    { id: sellerId, username: sellerUsername, role: 'seller' }
  ];
}

function createOrderId() {
  return `ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function parsePositive(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function createP2POrderController({ repos, walletService, orderTtlMs = 15 * 60 * 1000 }) {
  if (!repos || !walletService) {
    throw new Error('P2P order controller requires repos and walletService.');
  }

  async function createOrder(req, res) {
    try {
      const adId = String(req.body.adId || req.body.offerId || '').trim();
      if (!adId) {
        return res.status(400).json({ success: false, message: 'adId is required.' });
      }

      const offer = await repos.getOfferById(adId);
      if (!offer) {
        return res.status(404).json({ success: false, message: 'Ad not found.' });
      }

      const isDemo = offer.isDemo === true || String(offer.environment || '').trim().toLowerCase() === 'demo';
      const fundingSource = String(offer.fundingSource || '').trim().toLowerCase();
      if (
        String(offer.status || '').trim().toUpperCase() !== 'ACTIVE' ||
        isDemo ||
        offer.merchantDepositLocked !== true ||
        fundingSource !== 'ad_locked' ||
        !String(offer.createdByUserId || '').trim()
      ) {
        return res.status(400).json({ success: false, message: 'Ad is not available for trading.' });
      }

      if (offer.createdByUserId && offer.createdByUserId === req.p2pUser.id) {
        return res.status(400).json({ success: false, message: 'Buyer cannot buy own ad.' });
      }

      const price = Number(offer.price || 0);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: 'Ad price is invalid.' });
      }

      let cryptoAmount = parsePositive(req.body.cryptoAmount ?? req.body.assetAmount);
      let fiatAmount = parsePositive(req.body.fiatAmount ?? req.body.amountInr);

      if (cryptoAmount <= 0 && fiatAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Provide cryptoAmount or fiatAmount.' });
      }

      if (cryptoAmount > 0 && fiatAmount <= 0) {
        fiatAmount = cryptoAmount * price;
      } else if (fiatAmount > 0 && cryptoAmount <= 0) {
        cryptoAmount = fiatAmount / price;
      }

      const minLimit = Number(offer.minLimit || 0);
      const maxLimit = Number(offer.maxLimit || 0);
      if (!Number.isFinite(minLimit) || !Number.isFinite(maxLimit) || minLimit <= 0 || maxLimit < minLimit) {
        return res.status(400).json({ success: false, message: 'Ad limits are invalid.' });
      }
      if (fiatAmount < minLimit || fiatAmount > maxLimit) {
        return res.status(400).json({
          success: false,
          message: `Amount must be between ₹${minLimit.toLocaleString('en-IN')} and ₹${maxLimit.toLocaleString('en-IN')}.`
        });
      }

      const availableAmount = normalizeOfferAvailableAmount(offer);
      if (cryptoAmount > availableAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient ad liquidity.' });
      }

      const owner = resolveOfferOwner(offer);
      const buyer = String(offer.side || '').trim().toLowerCase() === 'buy' ? req.p2pUser : owner;
      const seller = String(offer.side || '').trim().toLowerCase() === 'buy' ? owner : req.p2pUser;

      if (String(buyer.id || '').trim() === String(seller.id || '').trim()) {
        return res.status(400).json({ success: false, message: 'Buyer and seller cannot be same account.' });
      }

      const selectedPaymentMethod = String(req.body.paymentMethod || '').trim();
      const exactPayment = Array.isArray(offer.payments)
        ? offer.payments.find((method) => method.toLowerCase() === selectedPaymentMethod.toLowerCase())
        : null;
      const paymentMethod = exactPayment || (Array.isArray(offer.payments) && offer.payments[0]) || 'UPI';
      if (selectedPaymentMethod && !exactPayment) {
        return res.status(400).json({ success: false, message: 'Selected payment method is not available for this ad.' });
      }

      const now = Date.now();
      const orderDoc = buildP2POrderDocument({
        id: createOrderId(),
        reference: createOrderReference(),
        adId,
        buyerId: buyer.id,
        sellerId: seller.id,
        buyerUsername: buyer.username || buyer.id,
        sellerUsername: seller.username || seller.id,
        side: offer.side || 'buy',
        asset: offer.asset || 'USDT',
        paymentMethod,
        price,
        cryptoAmount,
        fiatAmount,
        expiresAt: now + orderTtlMs,
        participants: buildOrderParticipants({
          buyerId: buyer.id,
          buyerUsername: buyer.username || buyer.id,
          sellerId: seller.id,
          sellerUsername: seller.username || seller.id
        }),
        messages: [
          {
            id: `msg_${now}_welcome`,
            sender: 'System',
            text: 'Order created. Escrow locked from seller wallet. Complete payment before timer ends.',
            createdAt: now
          }
        ]
      });

      const savedOrder = await walletService.createEscrowOrder(orderDoc);

      return res.status(201).json({
        ...toOrderResponse(savedOrder),
        order: savedOrder
      });
    } catch (error) {
      const knownStatus = Number(error?.status || 0);
      if (knownStatus >= 400 && knownStatus < 500) {
        return res.status(knownStatus).json({
          success: false,
          message: String(error.message || 'Order creation failed.'),
          code: String(error.code || 'P2P_ORDER_CREATE_FAILED')
        });
      }
      return res.status(500).json({ success: false, message: 'Server error while creating order.' });
    }
  }

  async function markPaymentSent(req, res) {
    try {
      const orderId = String(req.params.id || req.params.orderId || '').trim();
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order id is required.' });
      }

      const updatedOrder = await walletService.markOrderPaid(orderId, req.p2pUser);
      return res.json({
        ...toOrderResponse(updatedOrder),
        order: updatedOrder
      });
    } catch (error) {
      const knownStatus = Number(error?.status || 0);
      if (knownStatus >= 400 && knownStatus < 500) {
        return res.status(knownStatus).json({
          success: false,
          message: String(error.message || 'Unable to mark payment.'),
          code: String(error.code || 'P2P_MARK_PAID_FAILED')
        });
      }
      return res.status(500).json({ success: false, message: 'Server error while marking payment sent.' });
    }
  }

  async function releaseCrypto(req, res) {
    try {
      const orderId = String(req.params.id || req.params.orderId || '').trim();
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order id is required.' });
      }

      const updatedOrder = await walletService.releaseOrder(orderId, req.p2pUser);
      return res.json({
        ...toOrderResponse(updatedOrder),
        order: updatedOrder
      });
    } catch (error) {
      const knownStatus = Number(error?.status || 0);
      if (knownStatus >= 400 && knownStatus < 500) {
        return res.status(knownStatus).json({
          success: false,
          message: String(error.message || 'Unable to release order.'),
          code: String(error.code || 'P2P_RELEASE_FAILED')
        });
      }
      return res.status(500).json({ success: false, message: 'Server error while releasing order.' });
    }
  }

  return {
    createOrder,
    markPaymentSent,
    releaseCrypto
  };
}

module.exports = {
  createP2POrderController
};
