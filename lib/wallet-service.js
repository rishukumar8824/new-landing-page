const ACTIVE_ORDER_STATUSES = ['PENDING', 'PAID', 'DISPUTED'];
const CANCELLABLE_ORDER_STATUSES = ['PENDING', 'PAID', 'DISPUTED'];
const EXPIRABLE_ORDER_STATUSES = ['PENDING', 'PAID'];

const TX_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'local' },
  writeConcern: { w: 'majority' }
};

function createAppError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function toAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(8));
}

function makeSeedUserId(advertiser) {
  const slug = String(advertiser || 'marketmaker')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  return `seed_${slug || 'marketmaker'}`;
}

function sanitizeWallet(walletDoc) {
  if (!walletDoc) {
    return null;
  }

  return {
    userId: walletDoc.userId,
    username: walletDoc.username,
    balance: toAmount(walletDoc.balance),
    lockedBalance: toAmount(walletDoc.lockedBalance),
    createdAt: walletDoc.createdAt ? new Date(walletDoc.createdAt).toISOString() : null,
    updatedAt: walletDoc.updatedAt ? new Date(walletDoc.updatedAt).toISOString() : null
  };
}

function createWalletService(collections, mongoClient) {
  const { wallets, p2pOrders } = collections;
  const DEFAULT_USER_WALLET_BALANCE = toAmount(process.env.P2P_DEFAULT_USER_BALANCE || 10000);
  const DEFAULT_SEED_WALLET_BALANCE = toAmount(process.env.P2P_DEFAULT_SEED_WALLET_BALANCE || 1000000);

  if (!mongoClient) {
    throw new Error('Mongo client is required for wallet service.');
  }

  async function runInTransaction(work) {
    const session = mongoClient.startSession();
    try {
      let payload = null;
      await session.withTransaction(async () => {
        payload = await work(session);
      }, TX_OPTIONS);
      return payload;
    } finally {
      await session.endSession();
    }
  }

  async function ensureWallet(userId, options = {}, session = null) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw createAppError('INVALID_USER_ID', 'Wallet user id is required.');
    }

    const now = new Date();
    const initialBalance =
      options.initialBalance !== undefined ? toAmount(options.initialBalance) : DEFAULT_USER_WALLET_BALANCE;
    const normalizedUsername = String(options.username || normalizedUserId).trim();

    await wallets.updateOne(
      { userId: normalizedUserId },
      {
        $setOnInsert: {
          userId: normalizedUserId,
          balance: initialBalance,
          lockedBalance: 0,
          createdAt: now
        },
        $set: {
          username: normalizedUsername,
          updatedAt: now
        }
      },
      { upsert: true, session }
    );

    const wallet = await wallets.findOne({ userId: normalizedUserId }, { session });
    return sanitizeWallet(wallet);
  }

  async function getWallet(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return null;
    }

    const wallet = await wallets.findOne({ userId: normalizedUserId });
    return sanitizeWallet(wallet);
  }

  async function ensureSeedWallets(seedOffers = []) {
    if (!Array.isArray(seedOffers) || seedOffers.length === 0) {
      return { ensured: 0 };
    }

    let ensured = 0;
    const dedupe = new Set();

    for (const offer of seedOffers) {
      const ownerId = String(offer.createdByUserId || '').trim() || makeSeedUserId(offer.advertiser);
      if (dedupe.has(ownerId)) {
        continue;
      }
      dedupe.add(ownerId);
      const username = String(offer.createdByUsername || offer.advertiser || ownerId).trim();

      await ensureWallet(
        ownerId,
        {
          username,
          initialBalance: DEFAULT_SEED_WALLET_BALANCE
        },
        null
      );
      ensured += 1;
    }

    return { ensured };
  }

  async function createEscrowOrder(orderInput) {
    const escrowAmount = toAmount(orderInput.assetAmount);
    if (!Number.isFinite(escrowAmount) || escrowAmount <= 0) {
      throw createAppError('INVALID_ESCROW_AMOUNT', 'Escrow amount must be greater than 0.');
    }

    try {
      return await runInTransaction(async (session) => {
        const now = Date.now();
        const sellerUserId = String(orderInput.sellerUserId || '').trim();
        const buyerUserId = String(orderInput.buyerUserId || '').trim();

        if (!sellerUserId || !buyerUserId) {
          throw createAppError('INVALID_PARTIES', 'Both seller and buyer are required.');
        }

        const sellerUsername = String(orderInput.sellerUsername || sellerUserId).trim();
        const buyerUsername = String(orderInput.buyerUsername || buyerUserId).trim();
        const sellerInitialBalance = sellerUserId.startsWith('seed_')
          ? DEFAULT_SEED_WALLET_BALANCE
          : DEFAULT_USER_WALLET_BALANCE;

        await ensureWallet(
          sellerUserId,
          {
            username: sellerUsername,
            initialBalance: sellerInitialBalance
          },
          session
        );
        await ensureWallet(
          buyerUserId,
          {
            username: buyerUsername
          },
          session
        );

        const existingActive = await p2pOrders.findOne(
          {
            sellerUserId,
            status: { $in: ACTIVE_ORDER_STATUSES }
          },
          { session }
        );

        if (existingActive) {
          throw createAppError(
            'SELLER_ALREADY_HAS_ACTIVE_ORDER',
            'Seller already has an active order. Complete or cancel it first.',
            409
          );
        }

        const lockResult = await wallets.updateOne(
          {
            userId: sellerUserId,
            balance: { $gte: escrowAmount }
          },
          {
            $inc: {
              balance: -escrowAmount,
              lockedBalance: escrowAmount
            },
            $set: {
              updatedAt: new Date()
            }
          },
          { session }
        );

        if (lockResult.modifiedCount !== 1) {
          throw createAppError('INSUFFICIENT_BALANCE', 'Seller has insufficient balance for escrow.');
        }

        const orderDoc = {
          ...orderInput,
          sellerUserId,
          sellerUsername,
          buyerUserId,
          buyerUsername,
          assetAmount: escrowAmount,
          escrowAmount,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now
        };

        await p2pOrders.insertOne(orderDoc, { session });
        return orderDoc;
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw createAppError(
          'SELLER_ALREADY_HAS_ACTIVE_ORDER',
          'Seller already has an active order. Complete or cancel it first.',
          409
        );
      }
      throw error;
    }
  }

  async function markOrderPaid(orderId, actor) {
    const userId = String(actor?.userId || '').trim();
    if (!userId) {
      throw createAppError('INVALID_ACTOR', 'Actor is required.');
    }

    const now = Date.now();
    const statusResult = await p2pOrders.updateOne(
      {
        id: orderId,
        status: 'PENDING',
        buyerUserId: userId
      },
      {
        $set: {
          status: 'PAID',
          updatedAt: now
        },
        $push: {
          messages: {
            id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
            sender: actor.username || 'Buyer',
            text: `${actor.username || 'Buyer'} marked payment as completed.`,
            createdAt: now
          }
        }
      }
    );

    if (statusResult.modifiedCount !== 1) {
      const existing = await p2pOrders.findOne({ id: orderId });
      if (!existing) {
        throw createAppError('ORDER_NOT_FOUND', 'Order not found.', 404);
      }
      if (existing.buyerUserId !== userId) {
        throw createAppError('FORBIDDEN', 'Only buyer can mark this order as paid.', 403);
      }
      throw createAppError('INVALID_ORDER_STATUS', 'Order must be in PENDING status.');
    }

    const updated = await p2pOrders.findOne({ id: orderId });
    return updated;
  }

  async function setOrderDisputed(orderId, actor) {
    const userId = String(actor?.userId || '').trim();
    if (!userId) {
      throw createAppError('INVALID_ACTOR', 'Actor is required.');
    }

    const order = await p2pOrders.findOne({ id: orderId });
    if (!order) {
      throw createAppError('ORDER_NOT_FOUND', 'Order not found.', 404);
    }
    if (![order.sellerUserId, order.buyerUserId].includes(userId)) {
      throw createAppError('FORBIDDEN', 'Only participants can raise dispute.', 403);
    }
    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw createAppError('INVALID_ORDER_STATUS', 'Only active orders can be disputed.');
    }

    const now = Date.now();
    await p2pOrders.updateOne(
      { id: orderId },
      {
        $set: {
          status: 'DISPUTED',
          updatedAt: now
        },
        $push: {
          messages: {
            id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
            sender: actor.username || 'User',
            text: `${actor.username || 'User'} raised a dispute.`,
            createdAt: now
          }
        }
      }
    );

    return p2pOrders.findOne({ id: orderId });
  }

  async function releaseOrder(orderId, actor) {
    const actorId = String(actor?.userId || '').trim();
    if (!actorId) {
      throw createAppError('INVALID_ACTOR', 'Actor is required.');
    }

    return runInTransaction(async (session) => {
      const order = await p2pOrders.findOne({ id: orderId }, { session });
      if (!order) {
        throw createAppError('ORDER_NOT_FOUND', 'Order not found.', 404);
      }
      if (order.status !== 'PAID') {
        throw createAppError('INVALID_ORDER_STATUS', 'Only PAID orders can be released.');
      }
      if (order.sellerUserId !== actorId) {
        throw createAppError('FORBIDDEN', 'Only seller can release escrow.', 403);
      }

      const now = Date.now();
      const escrowAmount = toAmount(order.escrowAmount || order.assetAmount);

      const sellerDebit = await wallets.updateOne(
        {
          userId: order.sellerUserId,
          lockedBalance: { $gte: escrowAmount }
        },
        {
          $inc: {
            lockedBalance: -escrowAmount
          },
          $set: { updatedAt: new Date() }
        },
        { session }
      );

      if (sellerDebit.modifiedCount !== 1) {
        throw createAppError('ESCROW_INCONSISTENT', 'Seller locked balance not available.');
      }

      await ensureWallet(order.buyerUserId, { username: order.buyerUsername }, session);

      await wallets.updateOne(
        { userId: order.buyerUserId },
        {
          $inc: { balance: escrowAmount },
          $set: { updatedAt: new Date() }
        },
        { session }
      );

      const statusUpdate = await p2pOrders.updateOne(
        {
          id: orderId,
          status: 'PAID'
        },
        {
          $set: {
            status: 'RELEASED',
            updatedAt: now,
            releasedAt: now
          },
          $push: {
            messages: {
              id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
              sender: actor.username || 'Seller',
              text: `${actor.username || 'Seller'} released escrow successfully.`,
              createdAt: now
            }
          }
        },
        { session }
      );

      if (statusUpdate.modifiedCount !== 1) {
        throw createAppError('ORDER_STATE_RACE', 'Order status changed during release.', 409);
      }

      return p2pOrders.findOne({ id: orderId }, { session });
    });
  }

  async function cancelOrder(orderId, actor, status = 'CANCELLED') {
    const targetStatus = status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED';
    const actorId = String(actor?.userId || '').trim();
    const isSystem = actor?.isSystem === true;

    return runInTransaction(async (session) => {
      const order = await p2pOrders.findOne({ id: orderId }, { session });
      if (!order) {
        throw createAppError('ORDER_NOT_FOUND', 'Order not found.', 404);
      }
      if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
        throw createAppError('INVALID_ORDER_STATUS', `Order cannot be ${targetStatus.toLowerCase()}.`);
      }

      if (!isSystem && ![order.sellerUserId, order.buyerUserId].includes(actorId)) {
        throw createAppError('FORBIDDEN', 'Only buyer/seller can cancel this order.', 403);
      }

      const now = Date.now();
      const escrowAmount = toAmount(order.escrowAmount || order.assetAmount);

      const unlockSeller = await wallets.updateOne(
        {
          userId: order.sellerUserId,
          lockedBalance: { $gte: escrowAmount }
        },
        {
          $inc: {
            lockedBalance: -escrowAmount,
            balance: escrowAmount
          },
          $set: { updatedAt: new Date() }
        },
        { session }
      );

      if (unlockSeller.modifiedCount !== 1) {
        throw createAppError('ESCROW_INCONSISTENT', 'Escrow amount is not locked anymore.', 409);
      }

      const actorName = actor?.username || (isSystem ? 'System' : 'User');
      await p2pOrders.updateOne(
        {
          id: orderId,
          status: { $in: CANCELLABLE_ORDER_STATUSES }
        },
        {
          $set: {
            status: targetStatus,
            updatedAt: now
          },
          $push: {
            messages: {
              id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
              sender: actorName,
              text:
                targetStatus === 'EXPIRED'
                  ? 'Order expired. Escrow unlocked back to seller wallet.'
                  : `${actorName} cancelled order. Escrow unlocked back to seller wallet.`,
              createdAt: now
            }
          }
        },
        { session }
      );

      return p2pOrders.findOne({ id: orderId }, { session });
    });
  }

  async function expireOrders(nowMs = Date.now()) {
    const candidates = await p2pOrders
      .find({
        status: { $in: EXPIRABLE_ORDER_STATUSES },
        expiresAt: { $lte: nowMs }
      })
      .project({ id: 1 })
      .limit(100)
      .toArray();

    let expired = 0;
    for (const order of candidates) {
      try {
        await cancelOrder(
          order.id,
          {
            userId: 'system',
            username: 'System',
            isSystem: true
          },
          'EXPIRED'
        );
        expired += 1;
      } catch (error) {
        if (!['ORDER_NOT_FOUND', 'INVALID_ORDER_STATUS'].includes(error.code)) {
          throw error;
        }
      }
    }

    return { expired };
  }

  return {
    ensureWallet,
    getWallet,
    ensureSeedWallets,
    createEscrowOrder,
    markOrderPaid,
    setOrderDisputed,
    releaseOrder,
    cancelOrder,
    expireOrders,
    makeSeedUserId,
    createAppError
  };
}

module.exports = {
  createWalletService,
  makeSeedUserId,
  createAppError
};
