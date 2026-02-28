function createP2POrderExpiryService({ walletService } = {}) {
  if (!walletService || typeof walletService.expireOrders !== 'function') {
    throw new Error('walletService.expireOrders is required for P2P expiry service.');
  }

  async function runExpirySweep() {
    const result = await walletService.expireOrders();
    return {
      success: true,
      cancelledCount: Number(result?.expired || 0)
    };
  }

  return {
    runExpirySweep
  };
}

module.exports = {
  createP2POrderExpiryService
};

