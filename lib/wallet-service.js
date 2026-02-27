const { buildLedgerEntry } = require('../models/Ledger');
const {
  toAmount,
  sanitizeWallet,
  resolveAvailableBalance,
  resolveLockedBalance
} = require('../models/UserWallet');

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

function makeSeedUserId(advertiser) {
  const slug = String(advertiser || 'marketmaker')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  return `seed_${slug || 'marketmaker'}`;
}

function normalizeReference(reference, fallbackType, fallbackReferenceId) {
  if (typeof reference === 'string') {
    return {
      referenceId: String(reference).trim() || fallbackReferenceId,
      type: fallbackType,
      currency: 'USDT',
      metadata: {}
    };
  }

  const candidate = reference && typeof reference === 'object' ? reference : {};

  return {
    referenceId:
      String(candidate.referenceId || candidate.id || '').trim() ||
      fallbackReferenceId ||
      `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: String(candidate.type || fallbackType || '').trim().toLowerCase() || fallbackType,
    currency: String(candidate.currency || 'USDT')
      .trim()
      .toUpperCase(),
    metadata: candidate.metadata && typeof candidate.metadata === 'object' ? { ...candidate.metadata } : {},
    username: String(candidate.username || '').trim(),
    fromUsername: String(candidate.fromUsername || '').trim(),
    toUsername: String(candidate.toUsername || '').trim()
  };
}

function ensurePositiveAmount(rawAmount, fieldName = 'Amount') {
  const amount = toAmount(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createAppError('INVALID_AMOUNT', `${fieldName} must be greater than 0.`);
  }
  return amount;
}

function ensureUserId(rawUserId, fieldName = 'userId') {
  const userId = String(rawUserId || '').trim();
  if (!userId) {
    throw createAppError('INVALID_USER_ID', `${fieldName} is required.`);
  }
  return userId;
}

function createWalletService(collections, mongoClient, options = {}) {
  const { wallets, p2pOrders, ledgerEntries, walletFailures } = collections;
  const DEFAULT_USER_WALLET_BALANCE = toAmount(process.env.P2P_DEFAULT_USER_BALANCE || 10000);
  const DEFAULT_SEED_WALLET_BALANCE = toAmount(process.env.P2P_DEFAULT_SEED_WALLET_BALANCE || 1000000);
  const P2P_FEE_PERCENT = Math.max(0, toAmount(process.env.P2P_FEE_PERCENT || 0));
  const P2P_REVENUE_WALLET_USER_ID = String(process.env.P2P_REVENUE_WALLET_USER_ID || 'system_revenue_wallet').trim();
  const P2P_REVENUE_WALLET_USERNAME = String(process.env.P2P_REVENUE_WALLET_USERNAME || 'Bitegit Revenue').trim();

  const beforeOperationHook =
    typeof options.beforeOperation === 'function'
      ? options.beforeOperation
      : typeof options?.hooks?.beforeOperation === 'function'
        ? options.hooks.beforeOperation
        : null;

  if (!mongoClient) {
    throw new Error('Mongo client is required for wallet service.');
  }

  async function logFailedBalanceAttempt(operation, payload, error) {
    try {
      await walletFailures.insertOne({
        operation,
        userId: String(payload?.userId || '').trim(),
        counterpartyUserId: String(payload?.counterpartyUserId || '').trim(),
        amount: toAmount(payload?.amount),
        referenceId: String(payload?.referenceId || '').trim(),
        reason: String(error?.message || 'Unknown wallet failure'),
        errorCode: String(error?.code || 'WALLET_ERROR'),
        metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
        createdAt: new Date()
      });
    } catch (logError) {
      // Ignore logging failures to avoid masking primary error.
    }
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

  async function ensureWallet(userId, opts = {}, session = null) {
    const normalizedUserId = ensureUserId(userId);
    const now = new Date();
    const initialBalance =
      opts.initialBalance !== undefined ? toAmount(opts.initialBalance) : DEFAULT_USER_WALLET_BALANCE;
    const normalizedUsername = String(opts.username || normalizedUserId).trim();

    const existingWallet = await wallets.findOne({ userId: normalizedUserId }, { session });
    if (existingWallet) {
      const normalizedAvailable = resolveAvailableBalance(existingWallet);
      const normalizedLocked = resolveLockedBalance(existingWallet);
      await wallets.updateOne(
        { _id: existingWallet._id },
        {
          $set: {
            userId: normalizedUserId,
            username: normalizedUsername || existingWallet.username || normalizedUserId,
            availableBalance: normalizedAvailable,
            balance: normalizedAvailable,
            lockedBalance: normalizedLocked,
            updatedAt: now
          }
        },
        { session }
      );

      const refreshedWallet = await wallets.findOne({ _id: existingWallet._id }, { session });
      return sanitizeWallet(refreshedWallet || existingWallet);
    }

    const newWallet = {
      userId: normalizedUserId,
      username: normalizedUsername,
      availableBalance: initialBalance,
      balance: initialBalance,
      lockedBalance: 0,
      createdAt: now,
      updatedAt: now
    };

    try {
      await wallets.insertOne(newWallet, { session });

      if (initialBalance > 0) {
        const ledgerDoc = buildLedgerEntry({
          userId: normalizedUserId,
          type: 'deposit',
          amount: initialBalance,
          currency: 'USDT',
          beforeAvailable: 0,
          afterAvailable: initialBalance,
          beforeLocked: 0,
          afterLocked: 0,
          referenceId: `wallet_init_${normalizedUserId}`,
          metadata: {
            source: 'wallet_service.ensure_wallet',
            reason: 'initial_wallet_funding'
          },
          createdAt: now
        });
        await ledgerEntries.insertOne(ledgerDoc, { session });
      }

      return sanitizeWallet(newWallet);
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      await wallets.updateOne(
        { userId: normalizedUserId },
        {
          $set: {
            username: normalizedUsername,
            updatedAt: now
          }
        },
        { session }
      );

      const racedWallet = await wallets.findOne({ userId: normalizedUserId }, { session });
      return sanitizeWallet(racedWallet);
    }
  }

  async function applyWalletDeltaInSession({
    session,
    userId,
    username,
    initialBalance,
    deltaAvailable,
    deltaLocked,
    amount,
    type,
    currency = 'USDT',
    referenceId,
    metadata = {}
  }) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedDeltaAvailable = toAmount(deltaAvailable);
    const normalizedDeltaLocked = toAmount(deltaLocked);
    const normalizedAmount = ensurePositiveAmount(amount);
    const normalizedType = String(type || '').trim().toLowerCase();

    if (!normalizedType) {
      throw createAppError('INVALID_LEDGER_TYPE', 'Ledger type is required.');
    }

    await ensureWallet(
      normalizedUserId,
      {
        username: username || normalizedUserId,
        initialBalance:
          initialBalance !== undefined
            ? toAmount(initialBalance)
            : normalizedUserId.startsWith('seed_')
              ? DEFAULT_SEED_WALLET_BALANCE
              : DEFAULT_USER_WALLET_BALANCE
      },
      session
    );

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const walletDoc = await wallets.findOne({ userId: normalizedUserId }, { session });
      if (!walletDoc) {
        throw createAppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
      }

      const beforeAvailable = resolveAvailableBalance(walletDoc);
      const beforeLocked = resolveLockedBalance(walletDoc);
      const afterAvailable = toAmount(beforeAvailable + normalizedDeltaAvailable);
      const afterLocked = toAmount(beforeLocked + normalizedDeltaLocked);

      if (afterAvailable < 0) {
        throw createAppError('INSUFFICIENT_BALANCE', 'Insufficient available balance.', 400);
      }
      if (afterLocked < 0) {
        throw createAppError('INSUFFICIENT_LOCKED_BALANCE', 'Insufficient locked balance.', 400);
      }

      const now = new Date();
      const result = await wallets.updateOne(
        {
          _id: walletDoc._id,
          availableBalance: beforeAvailable,
          lockedBalance: beforeLocked
        },
        {
          $set: {
            userId: normalizedUserId,
            username: String(username || walletDoc.username || normalizedUserId).trim(),
            availableBalance: afterAvailable,
            balance: afterAvailable,
            lockedBalance: afterLocked,
            updatedAt: now
          }
        },
        { session }
      );

      if (result.modifiedCount === 1) {
        const ledgerDoc = buildLedgerEntry({
          userId: normalizedUserId,
          type: normalizedType,
          amount: normalizedAmount,
          currency: String(currency || 'USDT')
            .trim()
            .toUpperCase(),
          beforeAvailable,
          afterAvailable,
          beforeLocked,
          afterLocked,
          referenceId,
          metadata,
          createdAt: now
        });

        await ledgerEntries.insertOne(ledgerDoc, { session });

        return sanitizeWallet({
          ...walletDoc,
          availableBalance: afterAvailable,
          balance: afterAvailable,
          lockedBalance: afterLocked,
          updatedAt: now
        });
      }
    }

    throw createAppError('WALLET_CONFLICT', 'Wallet update conflict. Retry the operation.', 409);
  }

  async function invokeBeforeHook(payload) {
    if (!beforeOperationHook) {
      return;
    }
    await beforeOperationHook(payload);
  }

  async function creditAvailable(userId, amount, reference = {}) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedAmount = ensurePositiveAmount(amount, 'Credit amount');
    const ref = normalizeReference(reference, 'deposit', `credit_${Date.now()}`);

    await invokeBeforeHook({
      operation: 'credit_available',
      userId: normalizedUserId,
      amount: normalizedAmount,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        return applyWalletDeltaInSession({
          session,
          userId: normalizedUserId,
          username: ref.username,
          deltaAvailable: normalizedAmount,
          deltaLocked: 0,
          amount: normalizedAmount,
          type: ref.type || 'deposit',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        });
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'credit_available',
        {
          userId: normalizedUserId,
          amount: normalizedAmount,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        },
        error
      );
      throw error;
    }
  }

  async function debitAvailable(userId, amount, reference = {}) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedAmount = ensurePositiveAmount(amount, 'Debit amount');
    const ref = normalizeReference(reference, 'withdrawal', `debit_${Date.now()}`);

    await invokeBeforeHook({
      operation: 'debit_available',
      userId: normalizedUserId,
      amount: normalizedAmount,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        return applyWalletDeltaInSession({
          session,
          userId: normalizedUserId,
          username: ref.username,
          deltaAvailable: -normalizedAmount,
          deltaLocked: 0,
          amount: normalizedAmount,
          type: ref.type || 'withdrawal',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        });
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'debit_available',
        {
          userId: normalizedUserId,
          amount: normalizedAmount,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        },
        error
      );
      throw error;
    }
  }

  async function lockFunds(userId, amount, reference = {}) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedAmount = ensurePositiveAmount(amount, 'Lock amount');
    const ref = normalizeReference(reference, 'trade_sell', `lock_${Date.now()}`);

    await invokeBeforeHook({
      operation: 'lock_funds',
      userId: normalizedUserId,
      amount: normalizedAmount,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        return applyWalletDeltaInSession({
          session,
          userId: normalizedUserId,
          username: ref.username,
          deltaAvailable: -normalizedAmount,
          deltaLocked: normalizedAmount,
          amount: normalizedAmount,
          type: ref.type || 'trade_sell',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: {
            stage: 'lock_funds',
            ...ref.metadata
          }
        });
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'lock_funds',
        {
          userId: normalizedUserId,
          amount: normalizedAmount,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        },
        error
      );
      throw error;
    }
  }

  async function unlockFunds(userId, amount, reference = {}) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedAmount = ensurePositiveAmount(amount, 'Unlock amount');
    const ref = normalizeReference(reference, 'refund', `unlock_${Date.now()}`);

    await invokeBeforeHook({
      operation: 'unlock_funds',
      userId: normalizedUserId,
      amount: normalizedAmount,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        return applyWalletDeltaInSession({
          session,
          userId: normalizedUserId,
          username: ref.username,
          deltaAvailable: normalizedAmount,
          deltaLocked: -normalizedAmount,
          amount: normalizedAmount,
          type: ref.type || 'refund',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: {
            stage: 'unlock_funds',
            ...ref.metadata
          }
        });
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'unlock_funds',
        {
          userId: normalizedUserId,
          amount: normalizedAmount,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        },
        error
      );
      throw error;
    }
  }

  async function transferLockedToAvailable(fromUserId, toUserId, amount, reference = {}) {
    const normalizedFromUserId = ensureUserId(fromUserId, 'fromUserId');
    const normalizedToUserId = ensureUserId(toUserId, 'toUserId');
    const normalizedAmount = ensurePositiveAmount(amount, 'Transfer amount');

    if (normalizedFromUserId === normalizedToUserId) {
      throw createAppError('INVALID_TRANSFER', 'Source and destination wallet cannot be same.');
    }

    const ref = normalizeReference(reference, 'trade_sell', `xfer_${Date.now()}`);

    await invokeBeforeHook({
      operation: 'transfer_locked_to_available',
      userId: normalizedFromUserId,
      counterpartyUserId: normalizedToUserId,
      amount: normalizedAmount,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        const fromWallet = await applyWalletDeltaInSession({
          session,
          userId: normalizedFromUserId,
          username: ref.fromUsername,
          deltaAvailable: 0,
          deltaLocked: -normalizedAmount,
          amount: normalizedAmount,
          type: 'trade_sell',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: {
            role: 'seller',
            direction: 'locked_to_release',
            ...ref.metadata
          }
        });

        const toWallet = await applyWalletDeltaInSession({
          session,
          userId: normalizedToUserId,
          username: ref.toUsername,
          deltaAvailable: normalizedAmount,
          deltaLocked: 0,
          amount: normalizedAmount,
          type: 'trade_buy',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: {
            role: 'buyer',
            direction: 'escrow_receive',
            ...ref.metadata
          }
        });

        return { fromWallet, toWallet };
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'transfer_locked_to_available',
        {
          userId: normalizedFromUserId,
          counterpartyUserId: normalizedToUserId,
          amount: normalizedAmount,
          referenceId: ref.referenceId,
          metadata: ref.metadata
        },
        error
      );
      throw error;
    }
  }

  async function adminAdjustBalance(userId, amount, reason, reference = {}) {
    const normalizedUserId = ensureUserId(userId);
    const normalizedAmount = toAmount(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      throw createAppError('INVALID_AMOUNT', 'Admin adjustment amount must be non-zero.');
    }

    const ref = normalizeReference(reference, 'admin_adjustment', `admin_adj_${Date.now()}`);
    const adjustmentDirection = normalizedAmount > 0 ? 'credit' : 'debit';
    const absoluteAmount = toAmount(Math.abs(normalizedAmount));

    await invokeBeforeHook({
      operation: 'admin_adjust_balance',
      userId: normalizedUserId,
      amount: absoluteAmount,
      direction: adjustmentDirection,
      referenceId: ref.referenceId,
      metadata: ref.metadata
    });

    try {
      return await runInTransaction(async (session) => {
        const wallet = await applyWalletDeltaInSession({
          session,
          userId: normalizedUserId,
          username: ref.username,
          deltaAvailable: normalizedAmount,
          deltaLocked: 0,
          amount: absoluteAmount,
          type: 'admin_adjustment',
          currency: ref.currency,
          referenceId: ref.referenceId,
          metadata: {
            reason: String(reason || '').trim(),
            direction: adjustmentDirection,
            ...ref.metadata
          }
        });

        return wallet;
      });
    } catch (error) {
      await logFailedBalanceAttempt(
        'admin_adjust_balance',
        {
          userId: normalizedUserId,
          amount: absoluteAmount,
          referenceId: ref.referenceId,
          metadata: {
            reason: String(reason || '').trim(),
            ...ref.metadata
          }
        },
        error
      );
      throw error;
    }
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
      await ensureWallet(ownerId, {
        username,
        initialBalance: DEFAULT_SEED_WALLET_BALANCE
      });
      ensured += 1;
    }

    return { ensured };
  }

  async function createEscrowOrder(orderInput) {
    const escrowAmount = ensurePositiveAmount(orderInput.assetAmount, 'Escrow amount');

    try {
      return await runInTransaction(async (session) => {
        const now = Date.now();
        const sellerUserId = ensureUserId(orderInput.sellerUserId, 'sellerUserId');
        const buyerUserId = ensureUserId(orderInput.buyerUserId, 'buyerUserId');

        const sellerUsername = String(orderInput.sellerUsername || sellerUserId).trim();
        const buyerUsername = String(orderInput.buyerUsername || buyerUserId).trim();

        await ensureWallet(
          sellerUserId,
          {
            username: sellerUsername,
            initialBalance: sellerUserId.startsWith('seed_')
              ? DEFAULT_SEED_WALLET_BALANCE
              : DEFAULT_USER_WALLET_BALANCE
          },
          session
        );

        await ensureWallet(
          buyerUserId,
          {
            username: buyerUsername,
            initialBalance: buyerUserId.startsWith('seed_')
              ? DEFAULT_SEED_WALLET_BALANCE
              : DEFAULT_USER_WALLET_BALANCE
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

        await applyWalletDeltaInSession({
          session,
          userId: sellerUserId,
          username: sellerUsername,
          deltaAvailable: -escrowAmount,
          deltaLocked: escrowAmount,
          amount: escrowAmount,
          type: 'trade_sell',
          currency: String(orderInput.asset || 'USDT').trim().toUpperCase(),
          referenceId: String(orderInput.reference || orderInput.id || `escrow_${now}`).trim(),
          metadata: {
            stage: 'escrow_lock',
            orderId: String(orderInput.id || '').trim(),
            orderReference: String(orderInput.reference || '').trim(),
            offerId: String(orderInput.offerId || '').trim(),
            buyerUserId,
            buyerUsername
          }
        });

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
      await logFailedBalanceAttempt(
        'create_escrow_order',
        {
          userId: orderInput?.sellerUserId,
          counterpartyUserId: orderInput?.buyerUserId,
          amount: escrowAmount,
          referenceId: String(orderInput?.reference || orderInput?.id || '').trim(),
          metadata: {
            offerId: String(orderInput?.offerId || '').trim()
          }
        },
        error
      );

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

    try {
      return await runInTransaction(async (session) => {
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
        const escrowAmount = ensurePositiveAmount(order.escrowAmount || order.assetAmount, 'Escrow amount');
        const releaseReference = String(order.reference || order.id || `release_${now}`).trim();

        await applyWalletDeltaInSession({
          session,
          userId: order.sellerUserId,
          username: order.sellerUsername,
          deltaAvailable: 0,
          deltaLocked: -escrowAmount,
          amount: escrowAmount,
          type: 'trade_sell',
          currency: String(order.asset || 'USDT').trim().toUpperCase(),
          referenceId: releaseReference,
          metadata: {
            role: 'seller',
            direction: 'locked_to_release',
            stage: 'escrow_release',
            orderId: order.id,
            orderReference: order.reference,
            offerId: order.offerId
          }
        });

        await applyWalletDeltaInSession({
          session,
          userId: order.buyerUserId,
          username: order.buyerUsername,
          deltaAvailable: escrowAmount,
          deltaLocked: 0,
          amount: escrowAmount,
          type: 'trade_buy',
          currency: String(order.asset || 'USDT').trim().toUpperCase(),
          referenceId: releaseReference,
          metadata: {
            role: 'buyer',
            direction: 'escrow_receive',
            stage: 'escrow_release',
            orderId: order.id,
            orderReference: order.reference,
            offerId: order.offerId
          }
        });

        let feeAmount = 0;
        if (P2P_FEE_PERCENT > 0) {
          feeAmount = toAmount((escrowAmount * P2P_FEE_PERCENT) / 100);
          if (feeAmount > 0) {
            await applyWalletDeltaInSession({
              session,
              userId: order.buyerUserId,
              username: order.buyerUsername,
              deltaAvailable: -feeAmount,
              deltaLocked: 0,
              amount: feeAmount,
              type: 'fee',
              currency: String(order.asset || 'USDT').trim().toUpperCase(),
              referenceId: `${releaseReference}_fee`,
              metadata: {
                stage: 'p2p_release_fee_debit',
                orderId: order.id,
                orderReference: order.reference,
                feePercent: P2P_FEE_PERCENT
              }
            });

            await applyWalletDeltaInSession({
              session,
              userId: P2P_REVENUE_WALLET_USER_ID,
              username: P2P_REVENUE_WALLET_USERNAME,
              initialBalance: 0,
              deltaAvailable: feeAmount,
              deltaLocked: 0,
              amount: feeAmount,
              type: 'fee',
              currency: String(order.asset || 'USDT').trim().toUpperCase(),
              referenceId: `${releaseReference}_fee`,
              metadata: {
                stage: 'p2p_release_fee_credit',
                orderId: order.id,
                orderReference: order.reference,
                feePercent: P2P_FEE_PERCENT,
                fromUserId: order.buyerUserId
              }
            });
          }
        }

        const statusUpdate = await p2pOrders.updateOne(
          {
            id: orderId,
            status: 'PAID'
          },
          {
            $set: {
              status: 'RELEASED',
              updatedAt: now,
              releasedAt: now,
              feeAmount
            },
            $push: {
              messages: {
                id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
                sender: actor.username || 'Seller',
                text:
                  feeAmount > 0
                    ? `${actor.username || 'Seller'} released escrow successfully. Fee deducted: ${feeAmount} ${String(
                        order.asset || 'USDT'
                      ).toUpperCase()}.`
                    : `${actor.username || 'Seller'} released escrow successfully.`,
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
    } catch (error) {
      await logFailedBalanceAttempt(
        'release_order',
        {
          userId: actorId,
          amount: 0,
          referenceId: String(orderId || '').trim(),
          metadata: {
            orderId: String(orderId || '').trim()
          }
        },
        error
      );
      throw error;
    }
  }

  async function cancelOrder(orderId, actor, status = 'CANCELLED') {
    const targetStatus = status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED';
    const actorId = String(actor?.userId || '').trim();
    const isSystem = actor?.isSystem === true;

    try {
      return await runInTransaction(async (session) => {
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
        const escrowAmount = ensurePositiveAmount(order.escrowAmount || order.assetAmount, 'Escrow amount');
        const cancelReference = String(order.reference || order.id || `cancel_${now}`).trim();

        await applyWalletDeltaInSession({
          session,
          userId: order.sellerUserId,
          username: order.sellerUsername,
          deltaAvailable: escrowAmount,
          deltaLocked: -escrowAmount,
          amount: escrowAmount,
          type: 'refund',
          currency: String(order.asset || 'USDT').trim().toUpperCase(),
          referenceId: `${cancelReference}_${targetStatus.toLowerCase()}`,
          metadata: {
            stage: targetStatus === 'EXPIRED' ? 'auto_expiry_unlock' : 'cancel_unlock',
            orderId: order.id,
            orderReference: order.reference,
            actor: isSystem ? 'system' : actorId
          }
        });

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
    } catch (error) {
      await logFailedBalanceAttempt(
        'cancel_order',
        {
          userId: actorId,
          amount: 0,
          referenceId: String(orderId || '').trim(),
          metadata: {
            orderId: String(orderId || '').trim(),
            status: targetStatus
          }
        },
        error
      );
      throw error;
    }
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
    creditAvailable,
    debitAvailable,
    lockFunds,
    unlockFunds,
    transferLockedToAvailable,
    adminAdjustBalance,
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
