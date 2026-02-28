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

  app.post('/api/p2p/orders', requiresP2PUser, controller.createOrder);
  app.post('/api/p2p/orders/:id/mark-paid', requiresP2PUser, controller.markPaymentSent);
  app.post('/api/p2p/orders/:id/release', requiresP2PUser, controller.releaseCrypto);
}

module.exports = {
  registerP2POrderRoutes
};

