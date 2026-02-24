const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const P2P_USER_COOKIE_NAME = 'p2p_user_session';
const P2P_USER_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const P2P_ORDER_TTL_MS = 1000 * 60 * 15;

const sessions = new Map();
const p2pUsers = new Map();
const p2pOrders = new Map();
const p2pOrderStreams = new Map();

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'leads.json');
let p2pOffers = [
  {
    id: 'ofr_1001',
    side: 'buy',
    asset: 'USDT',
    advertiser: 'CryptoDeskPro',
    price: 89.61,
    available: 5250,
    minLimit: 500,
    maxLimit: 100000,
    completionRate: 99.2,
    orders: 1893,
    payments: ['UPI', 'IMPS']
  },
  {
    id: 'ofr_1002',
    side: 'buy',
    asset: 'USDT',
    advertiser: 'SecureTrades',
    price: 89.68,
    available: 11800,
    minLimit: 1000,
    maxLimit: 200000,
    completionRate: 98.5,
    orders: 2144,
    payments: ['Bank Transfer', 'NEFT']
  },
  {
    id: 'ofr_1003',
    side: 'buy',
    asset: 'USDT',
    advertiser: 'QuickUPIHub',
    price: 89.72,
    available: 3200,
    minLimit: 300,
    maxLimit: 50000,
    completionRate: 97.8,
    orders: 911,
    payments: ['UPI', 'Paytm']
  },
  {
    id: 'ofr_1004',
    side: 'sell',
    asset: 'USDT',
    advertiser: 'AlphaBuyer',
    price: 89.43,
    available: 7100,
    minLimit: 500,
    maxLimit: 150000,
    completionRate: 99.1,
    orders: 1440,
    payments: ['UPI', 'Bank Transfer']
  },
  {
    id: 'ofr_1005',
    side: 'sell',
    asset: 'USDT',
    advertiser: 'MarketMitra',
    price: 89.38,
    available: 4500,
    minLimit: 1000,
    maxLimit: 120000,
    completionRate: 98.9,
    orders: 1320,
    payments: ['IMPS', 'NEFT']
  },
  {
    id: 'ofr_1006',
    side: 'buy',
    asset: 'BTC',
    advertiser: 'BTCSource',
    price: 5790000,
    available: 0.34,
    minLimit: 1000,
    maxLimit: 250000,
    completionRate: 98.8,
    orders: 542,
    payments: ['Bank Transfer', 'UPI']
  },
  {
    id: 'ofr_1007',
    side: 'sell',
    asset: 'BTC',
    advertiser: 'CoinGateway',
    price: 5762000,
    available: 0.48,
    minLimit: 5000,
    maxLimit: 500000,
    completionRate: 97.6,
    orders: 392,
    payments: ['Bank Transfer']
  },
  {
    id: 'ofr_1008',
    side: 'buy',
    asset: 'ETH',
    advertiser: 'ETHFlow',
    price: 301200,
    available: 4.2,
    minLimit: 500,
    maxLimit: 85000,
    completionRate: 98.1,
    orders: 688,
    payments: ['UPI', 'NEFT']
  },
  {
    id: 'ofr_1009',
    side: 'sell',
    asset: 'ETH',
    advertiser: 'PrimePayDesk',
    price: 299800,
    available: 6.1,
    minLimit: 1000,
    maxLimit: 120000,
    completionRate: 99.3,
    orders: 904,
    payments: ['Bank Transfer', 'Paytm']
  }
];
let p2pOfferAutoId = 1010;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '[]', 'utf8');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readLeads() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function parseCookies(req) {
  const rawCookie = req.headers.cookie || '';
  const parsed = {};

  for (const item of rawCookie.split(';')) {
    const [rawKey, ...rawValueParts] = item.trim().split('=');
    if (!rawKey) {
      continue;
    }
    parsed[rawKey] = decodeURIComponent(rawValueParts.join('='));
  }

  return parsed;
}

function setCookie(res, key, value, maxAgeSeconds) {
  res.setHeader('Set-Cookie', `${key}=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`);
}

function clearCookie(res, key) {
  res.setHeader('Set-Cookie', `${key}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession() {
  const token = createToken();
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function removeExpiredAdminSessions() {
  const now = Date.now();
  for (const [token, expiry] of sessions.entries()) {
    if (expiry < now) {
      sessions.delete(token);
    }
  }
}

function isSessionValid(token) {
  if (!token || !sessions.has(token)) {
    return false;
  }

  const expiry = sessions.get(token);
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }

  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return true;
}

function requiresAdminSession(req, res, next) {
  removeExpiredAdminSessions();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!isSessionValid(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
}

function removeExpiredP2PUsers() {
  const now = Date.now();
  for (const [token, user] of p2pUsers.entries()) {
    if (user.expiresAt < now) {
      p2pUsers.delete(token);
    }
  }
}

function createP2PUserSession(username) {
  const token = createToken();
  const normalizedUsername = username.toLowerCase();
  const user = {
    id: `usr_${normalizedUsername}`,
    username,
    expiresAt: Date.now() + P2P_USER_TTL_MS
  };

  p2pUsers.set(token, user);
  return { token, user };
}

function getP2PUserFromRequest(req) {
  removeExpiredP2PUsers();
  const cookies = parseCookies(req);
  const token = cookies[P2P_USER_COOKIE_NAME];

  if (!token || !p2pUsers.has(token)) {
    return null;
  }

  const user = p2pUsers.get(token);
  if (!user || user.expiresAt < Date.now()) {
    p2pUsers.delete(token);
    return null;
  }

  user.expiresAt = Date.now() + P2P_USER_TTL_MS;
  p2pUsers.set(token, user);

  return user;
}

function requiresP2PUser(req, res, next) {
  const user = getP2PUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Please login to continue.' });
  }

  req.p2pUser = user;
  return next();
}

function createOrderReference() {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `P2P-${Date.now().toString().slice(-6)}-${randomPart}`;
}

function findOfferById(offerId) {
  return p2pOffers.find((offer) => offer.id === offerId) || null;
}

function createOfferId() {
  return `ofr_${p2pOfferAutoId++}`;
}

function findOrderByReference(reference) {
  for (const order of p2pOrders.values()) {
    if (order.reference === reference) {
      return order;
    }
  }
  return null;
}

function getParticipantsText(order) {
  return order.participants.map((participant) => participant.username).join(', ');
}

function normalizeOrderState(order) {
  if (!order) {
    return null;
  }

  if (order.status === 'OPEN' && Date.now() >= order.expiresAt) {
    order.status = 'EXPIRED';
    order.updatedAt = Date.now();
  }

  const remainingSeconds =
    order.status === 'OPEN' ? Math.max(0, Math.floor((order.expiresAt - Date.now()) / 1000)) : 0;

  return {
    id: order.id,
    reference: order.reference,
    side: order.side,
    asset: order.asset,
    status: order.status,
    advertiser: order.advertiser,
    price: order.price,
    amountInr: order.amountInr,
    assetAmount: order.assetAmount,
    paymentMethod: order.paymentMethod,
    participants: order.participants,
    participantsLabel: getParticipantsText(order),
    createdAt: new Date(order.createdAt).toISOString(),
    expiresAt: new Date(order.expiresAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    remainingSeconds
  };
}

function isParticipant(order, userId) {
  return order.participants.some((participant) => participant.id === userId);
}

function getNextParticipantRole(order) {
  const hasBuyer = order.participants.some((participant) => participant.role === 'buyer');
  const hasSeller = order.participants.some((participant) => participant.role === 'seller');

  if (!hasBuyer) {
    return 'buyer';
  }
  if (!hasSeller) {
    return 'seller';
  }
  return 'viewer';
}

function addSystemMessage(order, text) {
  const now = Date.now();
  order.messages.push({
    id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
    sender: 'System',
    text,
    createdAt: now
  });
}

function toClientMessages(messages) {
  return messages.map((msg) => ({
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    createdAt: new Date(msg.createdAt).toISOString()
  }));
}

function getOrderStreams(orderId) {
  if (!p2pOrderStreams.has(orderId)) {
    p2pOrderStreams.set(orderId, new Set());
  }
  return p2pOrderStreams.get(orderId);
}

function broadcastOrderEvent(orderId, eventName, payload) {
  const streams = p2pOrderStreams.get(orderId);
  if (!streams || streams.size === 0) {
    return;
  }

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const stream of streams) {
    stream.write(data);
  }
}

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = createSession();
    setCookie(res, SESSION_COOKIE_NAME, token, SESSION_TTL_MS / 1000);
    return res.json({ message: 'Login successful' });
  }

  clearCookie(res, SESSION_COOKIE_NAME);
  return res.status(401).json({ message: 'Invalid username or password' });
});

app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    sessions.delete(token);
  }

  clearCookie(res, SESSION_COOKIE_NAME);
  return res.json({ message: 'Logged out' });
});

app.post('/api/p2p/login', (req, res) => {
  const username = String(req.body.username || '').trim();

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ message: 'Username must be 3-20 chars (letters, numbers, underscore).' });
  }

  const { token, user } = createP2PUserSession(username);
  setCookie(res, P2P_USER_COOKIE_NAME, token, P2P_USER_TTL_MS / 1000);

  return res.json({
    message: 'P2P user logged in.',
    user: {
      id: user.id,
      username: user.username
    }
  });
});

app.post('/api/p2p/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[P2P_USER_COOKIE_NAME];
  if (token) {
    p2pUsers.delete(token);
  }

  clearCookie(res, P2P_USER_COOKIE_NAME);
  return res.json({ message: 'Logged out from P2P.' });
});

app.get('/api/p2p/me', (req, res) => {
  const user = getP2PUserFromRequest(req);

  if (!user) {
    return res.json({ loggedIn: false, user: null });
  }

  return res.json({
    loggedIn: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

app.get('/api/p2p/exchange-ticker', async (req, res) => {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
  const encodedSymbols = encodeURIComponent(JSON.stringify(symbols));

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodedSymbols}`
    );
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      throw new Error('Exchange API unavailable');
    }

    const ticker = data.map((item) => ({
      symbol: item.symbol,
      lastPrice: Number(item.lastPrice),
      change24h: Number(item.priceChangePercent)
    }));

    return res.json({
      source: 'binance',
      updatedAt: new Date().toISOString(),
      ticker
    });
  } catch (error) {
    return res.json({
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      ticker: [
        { symbol: 'BTCUSDT', lastPrice: 0, change24h: 0 },
        { symbol: 'ETHUSDT', lastPrice: 0, change24h: 0 },
        { symbol: 'BNBUSDT', lastPrice: 0, change24h: 0 },
        { symbol: 'SOLUSDT', lastPrice: 0, change24h: 0 },
        { symbol: 'XRPUSDT', lastPrice: 0, change24h: 0 }
      ]
    });
  }
});

app.post('/api/leads', (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile are required.' });
  }

  const cleanedName = String(name).trim();
  const cleanedMobile = String(mobile).replace(/\D/g, '');

  if (cleanedName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  if (!/^\d{10}$/.test(cleanedMobile)) {
    return res.status(400).json({ message: 'Mobile must be a valid 10-digit number.' });
  }

  const newLead = {
    id: Date.now(),
    name: cleanedName,
    mobile: cleanedMobile,
    createdAt: new Date().toISOString()
  };

  try {
    const leads = readLeads();
    leads.push(newLead);
    fs.writeFileSync(dataFile, JSON.stringify(leads, null, 2), 'utf8');
    return res.status(201).json({ message: 'Lead saved successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving lead.' });
  }
});

app.get('/api/leads', requiresAdminSession, (req, res) => {
  try {
    const leads = readLeads();
    const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sortedLeads);
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching leads.' });
  }
});

app.get('/api/p2p/offers', (req, res) => {
  const side = String(req.query.side || 'buy').toLowerCase();
  const asset = String(req.query.asset || 'USDT').toUpperCase();
  const payment = String(req.query.payment || '').trim().toLowerCase();
  const advertiser = String(req.query.advertiser || '').trim().toLowerCase();
  const amount = Number(req.query.amount || 0);

  const normalizedSide = side === 'sell' ? 'sell' : 'buy';

  const filtered = p2pOffers
    .filter((offer) => offer.side === normalizedSide)
    .filter((offer) => offer.asset === asset)
    .filter((offer) => {
      if (!payment) {
        return true;
      }
      return offer.payments.some((method) => method.toLowerCase().includes(payment));
    })
    .filter((offer) => {
      if (!advertiser) {
        return true;
      }
      return offer.advertiser.toLowerCase().includes(advertiser);
    })
    .filter((offer) => {
      if (!amount || Number.isNaN(amount)) {
        return true;
      }
      return amount >= offer.minLimit && amount <= offer.maxLimit;
    })
    .sort((a, b) => {
      if (normalizedSide === 'buy') {
        return a.price - b.price;
      }
      return b.price - a.price;
    });

  return res.json({
    side: normalizedSide,
    asset,
    total: filtered.length,
    updatedAt: new Date().toISOString(),
    offers: filtered
  });
});

app.post('/api/p2p/offers', requiresP2PUser, (req, res) => {
  const asset = String(req.body.asset || '').trim().toUpperCase();
  const adType = String(req.body.adType || 'sell').trim().toLowerCase();
  const price = Number(req.body.price || 0);
  const available = Number(req.body.available || 0);
  const minLimit = Number(req.body.minLimit || 0);
  const maxLimit = Number(req.body.maxLimit || 0);
  const rawPayments = Array.isArray(req.body.payments) ? req.body.payments : [];

  if (!['USDT', 'BTC', 'ETH'].includes(asset)) {
    return res.status(400).json({ message: 'Asset must be USDT, BTC or ETH.' });
  }

  if (!['sell', 'buy'].includes(adType)) {
    return res.status(400).json({ message: 'adType must be either sell or buy.' });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ message: 'Price must be greater than 0.' });
  }

  if (!Number.isFinite(available) || available <= 0) {
    return res.status(400).json({ message: 'Available quantity must be greater than 0.' });
  }

  if (!Number.isFinite(minLimit) || !Number.isFinite(maxLimit) || minLimit <= 0 || maxLimit < minLimit) {
    return res.status(400).json({ message: 'Enter valid min/max limits.' });
  }

  const payments = rawPayments
    .map((method) => String(method).trim())
    .filter((method) => method.length > 0)
    .slice(0, 4);

  if (payments.length === 0) {
    return res.status(400).json({ message: 'Add at least one payment method.' });
  }

  const takerActionSide = adType === 'sell' ? 'buy' : 'sell';
  const normalizedPrice = Number(price.toFixed(asset === 'USDT' ? 2 : 0));
  const normalizedAvailable = Number(available.toFixed(asset === 'USDT' ? 2 : 6));

  const newOffer = {
    id: createOfferId(),
    side: takerActionSide,
    asset,
    advertiser: req.p2pUser.username,
    price: normalizedPrice,
    available: normalizedAvailable,
    minLimit: Math.floor(minLimit),
    maxLimit: Math.floor(maxLimit),
    completionRate: 100,
    orders: 0,
    payments,
    createdByUserId: req.p2pUser.id,
    createdByUsername: req.p2pUser.username,
    adType
  };

  p2pOffers = [newOffer, ...p2pOffers];

  return res.status(201).json({
    message: 'Ad created successfully.',
    offer: newOffer
  });
});

app.post('/api/p2p/orders', requiresP2PUser, (req, res) => {
  const offerId = String(req.body.offerId || '').trim();
  const amountInr = Number(req.body.amountInr || 0);
  const offer = findOfferById(offerId);

  if (!offer) {
    return res.status(404).json({ message: 'Offer not found.' });
  }

  if (offer.createdByUserId && offer.createdByUserId === req.p2pUser.id) {
    return res.status(400).json({ message: 'You cannot create order on your own ad.' });
  }

  const fallbackAmount = offer.minLimit;
  const finalAmount = Number.isFinite(amountInr) && amountInr > 0 ? amountInr : fallbackAmount;

  if (finalAmount < offer.minLimit || finalAmount > offer.maxLimit) {
    return res.status(400).json({
      message: `Amount must be between ₹${offer.minLimit.toLocaleString('en-IN')} and ₹${offer.maxLimit.toLocaleString('en-IN')}.`
    });
  }

  const assetAmount = finalAmount / offer.price;
  const now = Date.now();
  const creatorRole = offer.side === 'buy' ? 'buyer' : 'seller';
  const counterpartyRole = creatorRole === 'buyer' ? 'seller' : 'buyer';
  const participants = [
    {
      id: req.p2pUser.id,
      username: req.p2pUser.username,
      role: creatorRole
    }
  ];

  if (offer.createdByUserId && offer.createdByUsername) {
    participants.push({
      id: offer.createdByUserId,
      username: offer.createdByUsername,
      role: counterpartyRole
    });
  }

  const order = {
    id: `ord_${now}_${Math.floor(Math.random() * 10000)}`,
    reference: createOrderReference(),
    offerId: offer.id,
    side: offer.side,
    asset: offer.asset,
    advertiser: offer.advertiser,
    paymentMethod: offer.payments[0],
    price: offer.price,
    amountInr: Number(finalAmount.toFixed(2)),
    assetAmount: Number(assetAmount.toFixed(6)),
    createdAt: now,
    expiresAt: now + P2P_ORDER_TTL_MS,
    updatedAt: now,
    status: 'OPEN',
    participants,
    messages: [
      {
        id: `msg_${now}_welcome`,
        sender: 'System',
        text: 'Order created. Complete payment before timer ends.',
        createdAt: now
      }
    ]
  };

  if (offer.createdByUserId && offer.createdByUsername) {
    addSystemMessage(order, `${offer.createdByUsername} is auto-added as counterparty from ad owner.`);
  }

  p2pOrders.set(order.id, order);

  return res.status(201).json({
    message: 'Order created successfully.',
    order: normalizeOrderState(order)
  });
});

app.get('/api/p2p/orders/live', requiresP2PUser, (req, res) => {
  const side = String(req.query.side || '').trim().toLowerCase();
  const asset = String(req.query.asset || '').trim().toUpperCase();

  const liveOrders = Array.from(p2pOrders.values())
    .map((order) => normalizeOrderState(order))
    .filter((order) => ['OPEN', 'PAID'].includes(order.status))
    .filter((order) => (side ? order.side === side : true))
    .filter((order) => (asset ? order.asset === asset : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((order) => ({
      id: order.id,
      reference: order.reference,
      side: order.side,
      asset: order.asset,
      status: order.status,
      advertiser: order.advertiser,
      amountInr: order.amountInr,
      price: order.price,
      participantsLabel: order.participantsLabel,
      isParticipant: order.participants.some((participant) => participant.id === req.p2pUser.id),
      updatedAt: order.updatedAt,
      remainingSeconds: order.remainingSeconds
    }));

  return res.json({
    total: liveOrders.length,
    orders: liveOrders
  });
});

app.get('/api/p2p/orders/by-reference/:reference', requiresP2PUser, (req, res) => {
  const reference = String(req.params.reference || '').trim();
  const order = findOrderByReference(reference);

  if (!order) {
    return res.status(404).json({ message: 'Order not found for this reference.' });
  }

  normalizeOrderState(order);

  if (!isParticipant(order, req.p2pUser.id)) {
    if (order.participants.length >= 2) {
      return res.status(400).json({ message: 'Order already has both buyer and seller.' });
    }

    order.participants.push({
      id: req.p2pUser.id,
      username: req.p2pUser.username,
      role: getNextParticipantRole(order)
    });
    order.updatedAt = Date.now();
    addSystemMessage(order, `${req.p2pUser.username} joined this order.`);

    broadcastOrderEvent(order.id, 'order_update', {
      order: normalizeOrderState(order)
    });
    broadcastOrderEvent(order.id, 'message_update', {
      messages: toClientMessages(order.messages)
    });
  }

  return res.json({
    order: normalizeOrderState(order)
  });
});

app.post('/api/p2p/orders/:orderId/join', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  normalizeOrderState(order);

  if (!isParticipant(order, req.p2pUser.id)) {
    if (order.participants.length >= 2) {
      return res.status(400).json({ message: 'Order already has both buyer and seller.' });
    }

    order.participants.push({
      id: req.p2pUser.id,
      username: req.p2pUser.username,
      role: getNextParticipantRole(order)
    });
    order.updatedAt = Date.now();
    addSystemMessage(order, `${req.p2pUser.username} joined this order.`);

    broadcastOrderEvent(order.id, 'order_update', {
      order: normalizeOrderState(order)
    });
    broadcastOrderEvent(order.id, 'message_update', {
      messages: toClientMessages(order.messages)
    });
  }

  return res.json({
    message: 'Order joined.',
    order: normalizeOrderState(order)
  });
});

app.get('/api/p2p/orders/:orderId', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  normalizeOrderState(order);

  if (!isParticipant(order, req.p2pUser.id)) {
    return res.status(403).json({ message: 'Join this order first to view details.' });
  }

  return res.json({
    order: normalizeOrderState(order)
  });
});

app.post('/api/p2p/orders/:orderId/status', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);
  const action = String(req.body.action || '').trim().toLowerCase();

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!isParticipant(order, req.p2pUser.id)) {
    return res.status(403).json({ message: 'Join this order first.' });
  }

  normalizeOrderState(order);

  if (action === 'cancel' && order.status === 'OPEN') {
    order.status = 'CANCELLED';
  } else if (action === 'mark_paid' && order.status === 'OPEN') {
    order.status = 'PAID';
  } else if (action === 'release' && order.status === 'PAID') {
    order.status = 'RELEASED';
  } else {
    return res.status(400).json({ message: 'Invalid action for current order status.' });
  }

  order.updatedAt = Date.now();
  addSystemMessage(order, `${req.p2pUser.username} changed order status to ${order.status}.`);

  const normalizedOrder = normalizeOrderState(order);
  const normalizedMessages = toClientMessages(order.messages);

  broadcastOrderEvent(order.id, 'order_update', { order: normalizedOrder });
  broadcastOrderEvent(order.id, 'message_update', { messages: normalizedMessages });

  return res.json({
    message: 'Order updated.',
    order: normalizedOrder
  });
});

app.get('/api/p2p/orders/:orderId/messages', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  normalizeOrderState(order);

  if (!isParticipant(order, req.p2pUser.id)) {
    return res.status(403).json({ message: 'Join this order first.' });
  }

  return res.json({
    messages: toClientMessages(order.messages)
  });
});

app.post('/api/p2p/orders/:orderId/messages', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);
  const text = String(req.body.text || '').trim();

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!isParticipant(order, req.p2pUser.id)) {
    return res.status(403).json({ message: 'Join this order first.' });
  }

  normalizeOrderState(order);

  if (['RELEASED', 'CANCELLED', 'EXPIRED'].includes(order.status)) {
    return res.status(400).json({ message: 'Order chat is closed for this status.' });
  }

  if (!text) {
    return res.status(400).json({ message: 'Message text is required.' });
  }

  const now = Date.now();
  order.messages.push({
    id: `msg_${now}_${Math.floor(Math.random() * 1000)}`,
    sender: req.p2pUser.username,
    text,
    createdAt: now
  });
  order.updatedAt = now;

  const normalizedMessages = toClientMessages(order.messages);
  broadcastOrderEvent(order.id, 'message_update', { messages: normalizedMessages });

  return res.status(201).json({
    message: 'Message sent.',
    messages: normalizedMessages
  });
});

app.get('/api/p2p/orders/:orderId/stream', requiresP2PUser, (req, res) => {
  const order = p2pOrders.get(req.params.orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!isParticipant(order, req.p2pUser.id)) {
    return res.status(403).json({ message: 'Join this order first.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const streams = getOrderStreams(order.id);
  streams.add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'stream-connected' })}\n\n`);

  req.on('close', () => {
    streams.delete(res);
    if (streams.size === 0) {
      p2pOrderStreams.delete(order.id);
    }
  });
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/p2p', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'p2p.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
