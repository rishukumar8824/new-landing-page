'use strict';

/**
 * Admin Blockchain Monitoring Controller
 * - Deposit scanner status
 * - Withdrawal queue monitoring
 * - Retry failed transactions
 * - View transaction hashes & confirmations
 */

function createAdminBlockchainControllers({ adminStore, extendedStore }) {

  /**
   * GET /api/admin/blockchain/scanner-status
   * Get deposit scanner health for all networks.
   */
  async function getScannerStatus(req, res) {
    const status = await extendedStore.getDepositScannerStatus();
    return res.json(status);
  }

  /**
   * GET /api/admin/blockchain/transactions
   * List blockchain transactions with filters.
   * Query: network, type (deposit|withdrawal), status, txHash, userId, from, to, page, limit
   */
  async function listTransactions(req, res) {
    const data = await extendedStore.listBlockchainTransactions(req.query);
    return res.json(data);
  }

  /**
   * GET /api/admin/blockchain/transactions/:txId
   * Get single transaction details with confirmations.
   */
  async function getTransaction(req, res) {
    const tx = await extendedStore.getBlockchainTransaction(req.params.txId);
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });
    return res.json({ transaction: tx });
  }

  /**
   * POST /api/admin/blockchain/transactions/:txId/retry
   * Retry a failed or stuck transaction.
   */
  async function retryTransaction(req, res) {
    const reason = String(req.body?.reason || 'Manual retry by admin').trim();
    const result = await extendedStore.retryBlockchainTransaction(req.params.txId, {
      adminId: req.adminAuth.adminId,
      reason
    });

    if (!result) return res.status(404).json({ message: 'Transaction not found or cannot be retried.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'blockchain',
      action: 'retry_transaction',
      entityType: 'blockchain_tx',
      entityId: req.params.txId,
      status: 'SUCCESS',
      meta: { reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Transaction queued for retry.', transaction: result });
  }

  /**
   * POST /api/admin/blockchain/transactions/:txId/mark-failed
   * Manually mark a transaction as permanently failed.
   */
  async function markTransactionFailed(req, res) {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'reason is required.' });

    const result = await extendedStore.markTransactionFailed(req.params.txId, {
      adminId: req.adminAuth.adminId,
      reason
    });

    if (!result) return res.status(404).json({ message: 'Transaction not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'blockchain',
      action: 'mark_transaction_failed',
      entityType: 'blockchain_tx',
      entityId: req.params.txId,
      status: 'SUCCESS',
      meta: { reason },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Transaction marked as failed.', transaction: result });
  }

  /**
   * GET /api/admin/blockchain/withdrawal-queue
   * View pending/processing withdrawal queue.
   * Query: network, status (PENDING|PROCESSING|BROADCASTING|CONFIRMING), page, limit
   */
  async function getWithdrawalQueue(req, res) {
    const data = await extendedStore.getWithdrawalQueue(req.query);
    return res.json(data);
  }

  /**
   * POST /api/admin/blockchain/withdrawal-queue/:withdrawalId/prioritize
   * Move a withdrawal to priority processing.
   */
  async function prioritizeWithdrawal(req, res) {
    const result = await extendedStore.prioritizeWithdrawal(req.params.withdrawalId, {
      adminId: req.adminAuth.adminId
    });

    if (!result) return res.status(404).json({ message: 'Withdrawal not found.' });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'blockchain',
      action: 'prioritize_withdrawal',
      entityType: 'withdrawal',
      entityId: req.params.withdrawalId,
      status: 'SUCCESS',
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Withdrawal prioritized.', withdrawal: result });
  }

  /**
   * GET /api/admin/blockchain/hot-wallet/balances
   * View hot wallet balances per network.
   */
  async function getHotWalletBalances(req, res) {
    const data = await extendedStore.getHotWalletNetworkBalances();
    return res.json(data);
  }

  /**
   * POST /api/admin/blockchain/rescan
   * Trigger a manual rescan for missing deposits on a network.
   * Body: { network: "TRC20", fromBlock?: number, toBlock?: number }
   */
  async function triggerRescan(req, res) {
    const network = String(req.body?.network || '').trim().toUpperCase();
    if (!network) return res.status(400).json({ message: 'network is required.' });

    const result = await extendedStore.triggerDepositRescan({
      network,
      fromBlock: req.body?.fromBlock,
      toBlock: req.body?.toBlock,
      requestedBy: req.adminAuth.adminId
    });

    await adminStore.writeAuditLog({
      adminId: req.adminAuth.adminId,
      adminEmail: req.adminAuth.adminEmail,
      adminRole: req.adminAuth.adminRole,
      module: 'blockchain',
      action: 'trigger_rescan',
      entityType: 'deposit_scanner',
      entityId: network,
      status: 'SUCCESS',
      meta: { network, fromBlock: req.body?.fromBlock, toBlock: req.body?.toBlock },
      ip: req.adminAuth.ip,
      userAgent: req.adminAuth.userAgent
    });

    return res.json({ message: 'Rescan triggered.', ...result });
  }

  /**
   * GET /api/admin/blockchain/stats
   * Blockchain monitoring dashboard stats.
   */
  async function getBlockchainStats(req, res) {
    const stats = await extendedStore.getBlockchainStats();
    return res.json(stats);
  }

  return {
    getScannerStatus,
    listTransactions,
    getTransaction,
    retryTransaction,
    markTransactionFailed,
    getWithdrawalQueue,
    prioritizeWithdrawal,
    getHotWalletBalances,
    triggerRescan,
    getBlockchainStats
  };
}

module.exports = { createAdminBlockchainControllers };
