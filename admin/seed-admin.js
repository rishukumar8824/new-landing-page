/**
 * Sample admin seed utility.
 *
 * Usage:
 *   node admin/seed-admin.js
 */
try {
  require('dotenv').config({ override: true });
} catch (error) {
  // Fallback loader below
}

const { loadEnvFile } = require('../lib/env');
loadEnvFile(undefined, { override: true });

const { connectToMongo, getCollections, isDbConnected } = require('../lib/db');
const { createRepositories } = require('../lib/repositories');
const { createWalletService } = require('../lib/wallet-service');
const { createAdminStore } = require('./services/admin-store');
const tokenService = require('../services/tokenService');
const { getMongoClient } = require('../lib/db');

function normalizeUsername(input) {
  const normalized = String(input || 'admin')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
  return normalized || 'admin';
}

async function run() {
  const username = normalizeUsername(process.env.ADMIN_USERNAME || 'admin');
  const email = String(process.env.ADMIN_EMAIL || `${username}@admin.local`)
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '').trim();
  const role = String(process.env.ADMIN_ROLE || 'SUPER_ADMIN')
    .trim()
    .toUpperCase();

  if (!String(process.env.MONGODB_URI || '').trim()) {
    throw new Error('MONGODB_URI is required in .env');
  }

  tokenService.ensureJwtSecret();

  if (!password) {
    throw new Error('ADMIN_PASSWORD is required for seeding.');
  }

  await connectToMongo();
  const collections = getCollections();
  const repos = createRepositories(collections);
  const walletService = createWalletService(collections, getMongoClient());
  const adminStore = createAdminStore({ collections, repos, walletService, tokenService, isDbConnected });

  await repos.ensureIndexes();
  await adminStore.ensureIndexes();
  await adminStore.ensureDefaults();

  const seeded = await adminStore.seedAdminUser({ username, email, password, role });
  console.log('Admin seed ensured:', {
    username: seeded?.username,
    email: seeded?.email,
    role: seeded?.role,
    status: seeded?.status
  });
}

run().catch((error) => {
  console.error('Admin seed failed:', error.message);
  process.exit(1);
});
