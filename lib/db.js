const { MongoClient } = require('mongodb');

const DEFAULT_DB_NAME = 'bitegit';

let client = null;
let db = null;
let connected = false;
let cachedCollections = null;
let connectingPromise = null;
let activeConfig = null;

function toBool(value) {
  return String(value || '')
    .trim()
    .toLowerCase() === 'true';
}

function maskMongoUri(uri) {
  const raw = String(uri || '').trim();
  if (!raw) {
    return '';
  }

  return raw.replace(
    /(mongodb(?:\+srv)?:\/\/)([^@/]+)@/i,
    (_, prefix, credentials) => {
      const user = String(credentials || '').split(':')[0] || 'user';
      return `${prefix}${user}:***@`;
    }
  );
}

function loadMongoConfig() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME).trim() || DEFAULT_DB_NAME;
  const allowLocalMongo = toBool(process.env.ALLOW_LOCAL_MONGO);
  const maskedUri = maskMongoUri(uri);
  return { uri, dbName, allowLocalMongo, maskedUri };
}

function isLocalMongoUri(uri) {
  const normalized = String(uri || '').trim().toLowerCase();
  return /mongodb(?:\+srv)?:\/\/[^/]*(localhost|127\.0\.0\.1|\[::1\])/.test(normalized);
}

function formatMongoConnectionError(error, config) {
  const baseMessage = String(error?.message || 'Unknown MongoDB connection failure');
  const hints = [];

  if (/ECONNREFUSED|127\.0\.0\.1|localhost/i.test(baseMessage)) {
    hints.push('Connection refused. Use a valid Atlas URI in MONGODB_URI or set ALLOW_LOCAL_MONGO=true for local MongoDB.');
  }

  if (/bad auth|Authentication failed|auth failed/i.test(baseMessage)) {
    hints.push('Check Atlas username/password in MONGODB_URI and ensure user has DB access.');
  }

  if (/querySrv ENOTFOUND|ENOTFOUND|dns/i.test(baseMessage)) {
    hints.push('DNS resolution failed. Verify Atlas cluster host in MONGODB_URI.');
  }

  const hintMessage = hints.length > 0 ? ` Hint: ${hints.join(' ')}` : '';
  return `MongoDB connection failed for database "${config.dbName}". ${baseMessage}.${hintMessage}`;
}

function getMongoConfig() {
  const current = loadMongoConfig();
  return {
    uri: current.uri,
    maskedUri: current.maskedUri,
    dbName: current.dbName,
    allowLocalMongo: current.allowLocalMongo
  };
}

async function connectToMongo() {
  if (connected && db) {
    return db;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  const config = loadMongoConfig();
  if (!config.uri) {
    throw new Error('MONGODB_URI is required. Add it in .env (recommended Atlas URI).');
  }

  if (isLocalMongoUri(config.uri) && !config.allowLocalMongo) {
    throw new Error(
      'Local MongoDB URI detected but local mode is disabled. Use Atlas MONGODB_URI or set ALLOW_LOCAL_MONGO=true.'
    );
  }

  connectingPromise = (async () => {
    try {
      client = new MongoClient(config.uri, {
        maxPoolSize: 25,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 12000
      });

      await client.connect();
      db = client.db(config.dbName);
      await db.command({ ping: 1 });
      connected = true;
      cachedCollections = null;
      activeConfig = { dbName: config.dbName, uri: config.uri };

      client.once('close', () => {
        connected = false;
      });

      return db;
    } catch (error) {
      connected = false;
      db = null;
      cachedCollections = null;
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore cleanup errors.
        }
      }
      client = null;
      throw new Error(formatMongoConnectionError(error, config));
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
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
    refreshTokens: database.collection('refresh_tokens'),
    adminUsers: database.collection('admin_users'),
    adminUserProfiles: database.collection('admin_user_profiles'),
    adminSessionsV2: database.collection('admin_sessions_v2'),
    adminRefreshTokens: database.collection('admin_refresh_tokens'),
    adminAuditLogs: database.collection('admin_audit_logs'),
    adminLoginHistory: database.collection('admin_login_history'),
    adminPlatformSettings: database.collection('admin_platform_settings'),
    adminSupportTickets: database.collection('admin_support_tickets'),
    adminWalletConfig: database.collection('admin_wallet_config'),
    adminHotWallets: database.collection('admin_hot_wallets'),
    adminWithdrawals: database.collection('admin_withdrawals'),
    adminDeposits: database.collection('admin_deposits'),
    adminSpotPairs: database.collection('admin_spot_pairs'),
    adminP2PConfig: database.collection('admin_p2p_config'),
    adminComplianceFlags: database.collection('admin_compliance_flags'),
    adminApiLogs: database.collection('admin_api_logs'),
    adminKycDocuments: database.collection('admin_kyc_documents'),
    signupOtps: database.collection('signup_otps'),
    p2pCredentials: database.collection('p2p_credentials'),
    p2pUserSessions: database.collection('p2p_user_sessions'),
    wallets: database.collection('wallets'),
    ledgerEntries: database.collection('ledger_entries'),
    walletFailures: database.collection('wallet_failures'),
    withdrawalRequests: database.collection('withdrawal_requests'),
    auditLogs: database.collection('audit_logs'),
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
