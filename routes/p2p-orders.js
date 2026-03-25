function registerP2POrderRoutes(app, deps = {}) {
  if (!app) {
    throw new Error('Express app is required to register P2P order routes.');
  }

  const requiresP2PUser = deps.requiresP2PUser;
  const controller = deps.controller;

  if (typeof requiresP2PUser !== 'function') {
    throw new Error('requiresP2PUser middleware is required for P2P order routes.');
  }

  if (!controller || typeof controller.createOrder !== 'function') {
    throw new Error('P2P order controller is required for P2P order routes.');
  }
  if (typeof controller.markPaymentSent !== 'function') {
    throw new Error('markPaymentSent handler is required for P2P order routes.');
  }
  if (typeof controller.releaseCrypto !== 'function') {
    throw new Error('releaseCrypto handler is required for P2P order routes.');
  }
  if (typeof controller.cancelOrder !== 'function') {
    throw new Error('cancelOrder handler is required for P2P order routes.');
  }

  app.post('/api/p2p/orders', requiresP2PUser, controller.createOrder);
  app.post('/api/p2p/orders/:id/mark-paid', requiresP2PUser, controller.markPaymentSent);
  app.post('/api/p2p/orders/:id/release', requiresP2PUser, controller.releaseCrypto);
  app.post('/api/p2p/orders/:id/cancel', requiresP2PUser, controller.cancelOrder);
}

module.exports = {
  registerP2POrderRoutes
};
