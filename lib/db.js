const { MongoClient } = require('mongodb');

const MONGODB_URI = String(process.env.MONGODB_URI || '').trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || 'bitegit').trim() || 'bitegit';

let client = null;
let db = null;
let connected = false;
let cachedCollections = null;

function getMongoConfig() {
  return {
    uri: MONGODB_URI,
    dbName: MONGODB_DB_NAME
  };
}

async function connectToMongo() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (client && db && connected) {
    return db;
  }

  client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 25,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000
  });

  await client.connect();
  db = client.db(MONGODB_DB_NAME);
  connected = true;

  client.on('close', () => {
    connected = false;
  });

  return db;
}

function isDbConnected() {
  return connected;
}

function getMongoClient() {
  if (!client) {
    throw new Error('MongoDB client not initialized');
  }
  return client;
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  return db;
}

function getCollections() {
  if (cachedCollections) {
    return cachedCollections;
  }

  const database = getDb();
  cachedCollections = {
    leads: database.collection('leads'),
    adminSessions: database.collection('admin_sessions'),
    signupOtps: database.collection('signup_otps'),
    p2pCredentials: database.collection('p2p_credentials'),
    p2pUserSessions: database.collection('p2p_user_sessions'),
    wallets: database.collection('wallets'),
    p2pOffers: database.collection('p2p_offers'),
    p2pOrders: database.collection('p2p_orders'),
    tradeOrders: database.collection('trade_orders'),
    appMeta: database.collection('app_meta'),
    counters: database.collection('counters')
  };

  return cachedCollections;
}

module.exports = {
  connectToMongo,
  getCollections,
  getMongoClient,
  getMongoConfig,
  isDbConnected
};
