const STREAM_RETRY_MS = 2000;
const STREAM_KEEPALIVE_MS = 15000;
const WATCH_RESTART_DELAY_MS = 3000;

function createP2PRealtimeHub(options = {}) {
  const logger = options.logger || console;
  const serializeOrder = typeof options.serializeOrder === 'function' ? options.serializeOrder : (order) => order;
  const serializeMessages =
    typeof options.serializeMessages === 'function' ? options.serializeMessages : (messages) => messages || [];

  const orderStreams = new Map();
  const userStreams = new Map();
  let orderChangeStream = null;
  let restartTimer = null;
  let watchedCollection = null;
  let shuttingDown = false;

  function toEvent(eventName, payload) {
    return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  }

  function extractParticipantIds(order = {}) {
    const participantIds = new Set();
    if (Array.isArray(order.participants)) {
      for (const participant of order.participants) {
        const participantId = String(participant?.id || '').trim();
        if (participantId) {
          participantIds.add(participantId);
        }
      }
    }

    const buyerUserId = String(order.buyerUserId || '').trim();
    const sellerUserId = String(order.sellerUserId || '').trim();
    if (buyerUserId) {
      participantIds.add(buyerUserId);
    }
    if (sellerUserId) {
      participantIds.add(sellerUserId);
    }

    return Array.from(participantIds);
  }

  function writeToBucket(bucket, payload) {
    if (!bucket || bucket.size === 0) {
      return;
    }

    for (const entry of Array.from(bucket)) {
      if (!entry?.res || entry.res.writableEnded || entry.res.destroyed) {
        bucket.delete(entry);
        entry?.cleanup?.();
        continue;
      }

      try {
        entry.res.write(payload);
      } catch (error) {
        bucket.delete(entry);
        entry.cleanup?.();
      }
    }
  }

  function broadcastToOrder(orderId, eventName, payload) {
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      return;
    }
    const bucket = orderStreams.get(normalizedOrderId);
    writeToBucket(bucket, toEvent(eventName, payload));
  }

  function broadcastToUsers(userIds, eventName, payload) {
    for (const userId of userIds) {
      const normalizedUserId = String(userId || '').trim();
      if (!normalizedUserId) {
        continue;
      }
      const bucket = userStreams.get(normalizedUserId);
      writeToBucket(bucket, toEvent(eventName, payload));
    }
  }

  function createStreamEntry(bucket) {
    let cleaned = false;
    let heartbeat = null;

    const entry = {
      res: null,
      cleanup() {
        if (cleaned) {
          return;
        }
        cleaned = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        bucket.delete(entry);
      }
    };

    entry.startHeartbeat = function startHeartbeat() {
      heartbeat = setInterval(() => {
        if (!entry.res || entry.res.writableEnded || entry.res.destroyed) {
          entry.cleanup();
          return;
        }
        try {
          entry.res.write(': keepalive\n\n');
        } catch (error) {
          entry.cleanup();
        }
      }, STREAM_KEEPALIVE_MS);
    };

    return entry;
  }

  function attachHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`retry: ${STREAM_RETRY_MS}\n\n`);
  }

  function attachStream({ req, res, bucketMap, key, connectedPayload }) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) {
      throw new Error('Stream key is required.');
    }

    if (!bucketMap.has(normalizedKey)) {
      bucketMap.set(normalizedKey, new Set());
    }
    const bucket = bucketMap.get(normalizedKey);
    const entry = createStreamEntry(bucket);
    entry.res = res;
    bucket.add(entry);

    attachHeaders(res);
    entry.startHeartbeat();
    res.write(toEvent('connected', connectedPayload));

    const cleanup = () => {
      entry.cleanup();
      if (bucket.size === 0) {
        bucketMap.delete(normalizedKey);
      }
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
    req.on('error', cleanup);
  }

  function publishOrderSnapshot(order, options = {}) {
    if (!order || !order.id) {
      return;
    }

    const normalizedOrder = serializeOrder(order);
    const normalizedMessages =
      options.includeMessages === false ? null : serializeMessages(Array.isArray(order.messages) ? order.messages : []);
    const participantIds = extractParticipantIds(order);

    broadcastToOrder(order.id, 'order_update', { order: normalizedOrder });
    if (normalizedMessages) {
      broadcastToOrder(order.id, 'message_update', { messages: normalizedMessages });
    }
    broadcastToUsers(participantIds, 'orders_refresh', {
      orderId: String(order.id || '').trim(),
      status: normalizedOrder?.status || String(order.status || '').trim().toUpperCase(),
      updatedAt: normalizedOrder?.updatedAt || new Date(order.updatedAt || Date.now()).toISOString()
    });
  }

  function publishOrderMessages(order, messages) {
    if (!order || !order.id) {
      return;
    }

    const normalizedMessages = serializeMessages(Array.isArray(messages) ? messages : order.messages || []);
    const participantIds = extractParticipantIds(order);
    broadcastToOrder(order.id, 'message_update', { messages: normalizedMessages });
    broadcastToUsers(participantIds, 'orders_refresh', {
      orderId: String(order.id || '').trim(),
      status: String(order.status || '').trim().toUpperCase(),
      updatedAt: new Date(order.updatedAt || Date.now()).toISOString()
    });
  }

  function scheduleRestart() {
    if (shuttingDown || restartTimer || !watchedCollection) {
      return;
    }

    restartTimer = setTimeout(() => {
      restartTimer = null;
      startOrderWatcher(watchedCollection);
    }, WATCH_RESTART_DELAY_MS);
  }

  function bindWatcher(stream) {
    stream.on('change', (change) => {
      const fullDocument = change?.fullDocument;
      if (!fullDocument || !fullDocument.id) {
        return;
      }
      publishOrderSnapshot(fullDocument);
    });

    stream.on('error', (error) => {
      if (!shuttingDown) {
        logger.warn?.('[p2p-realtime] order change stream failed:', error?.message || error);
      }
      try {
        stream.close();
      } catch (closeError) {
        // ignore
      }
      if (orderChangeStream === stream) {
        orderChangeStream = null;
      }
      scheduleRestart();
    });

    stream.on('close', () => {
      if (orderChangeStream === stream) {
        orderChangeStream = null;
      }
      scheduleRestart();
    });
  }

  function startOrderWatcher(collection) {
    watchedCollection = collection || watchedCollection;
    if (!watchedCollection || typeof watchedCollection.watch !== 'function' || shuttingDown || orderChangeStream) {
      return;
    }

    try {
      const stream = watchedCollection.watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
        { fullDocument: 'updateLookup' }
      );
      orderChangeStream = stream;
      bindWatcher(stream);
    } catch (error) {
      logger.warn?.('[p2p-realtime] change stream unavailable, realtime falls back to direct emits:', error?.message || error);
    }
  }

  async function close() {
    shuttingDown = true;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    if (orderChangeStream) {
      try {
        await orderChangeStream.close();
      } catch (error) {
        // ignore close errors
      }
      orderChangeStream = null;
    }

    for (const bucket of orderStreams.values()) {
      for (const entry of bucket) {
        entry.cleanup?.();
      }
    }
    orderStreams.clear();

    for (const bucket of userStreams.values()) {
      for (const entry of bucket) {
        entry.cleanup?.();
      }
    }
    userStreams.clear();
  }

  return {
    attachOrderStream(req, res, orderId) {
      attachStream({
        req,
        res,
        bucketMap: orderStreams,
        key: orderId,
        connectedPayload: { scope: 'order', orderId: String(orderId || '').trim() }
      });
    },
    attachUserStream(req, res, userId) {
      attachStream({
        req,
        res,
        bucketMap: userStreams,
        key: userId,
        connectedPayload: { scope: 'user', userId: String(userId || '').trim() }
      });
    },
    publishOrderSnapshot,
    publishOrderMessages,
    startOrderWatcher,
    close
  };
}

module.exports = {
  createP2PRealtimeHub
};
