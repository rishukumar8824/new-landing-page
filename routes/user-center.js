const rateLimit = require('express-rate-limit');

function registerUserCenterRoutes(app, {
  requiresP2PUser,
  userCenterService
}) {
  if (!userCenterService) {
    app.get('/api/user-center/health', (req, res) => {
      res.status(503).json({ success: false, message: 'User Center service is not configured.' });
    });
    return;
  }

  const securityLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many security requests. Try again later.' }
  });

  const supportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many support requests. Try again later.' }
  });

  function sendError(res, error) {
    return res.status(Number(error?.statusCode) || 500).json({
      success: false,
      message: String(error?.message || 'User Center operation failed.'),
      code: String(error?.code || 'USER_CENTER_ERROR')
    });
  }

  app.get('/api/user-center/me', requiresP2PUser, async (req, res) => {
    try {
      const data = await userCenterService.getUserCenterSummary(req.p2pUser);
      return res.json({ success: true, data });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.put('/api/user-center/profile', requiresP2PUser, async (req, res) => {
    try {
      const profile = await userCenterService.updateProfile(req.p2pUser, {
        nickname: req.body?.nickname,
        avatar: req.body?.avatar
      });
      return res.json({ success: true, profile });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/identity', requiresP2PUser, async (req, res) => {
    try {
      const identity = await userCenterService.getIdentity(req.p2pUser);
      return res.json({ success: true, identity });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.put('/api/user-center/identity', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const profile = await userCenterService.updateIdentity(req.p2pUser, req.body || {});
      return res.json({ success: true, profile });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/change-password', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const data = await userCenterService.changePassword(req.p2pUser, {
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword
      });
      return res.json({ success: true, ...data });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/change-phone', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const data = await userCenterService.changePhone(req.p2pUser, {
        phone: req.body?.phone
      });
      return res.json({ success: true, ...data });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/change-email', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const data = await userCenterService.changeEmail(req.p2pUser, {
        email: req.body?.email
      });
      return res.json({ success: true, ...data });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/link-2fa', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const action = String(req.body?.action || 'generate').trim().toLowerCase();
      if (action === 'generate') {
        const data = await userCenterService.generateTwoFactor(req.p2pUser);
        return res.json({ success: true, ...data });
      }
      if (action === 'verify') {
        const data = await userCenterService.verifyAndEnableTwoFactor(req.p2pUser, {
          code: req.body?.code
        });
        return res.json({ success: true, ...data });
      }
      if (action === 'disable') {
        const data = await userCenterService.disableTwoFactor(req.p2pUser, {
          code: req.body?.code
        });
        return res.json({ success: true, ...data });
      }
      return res.status(400).json({ success: false, message: 'Unsupported action for 2FA.' });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/set-fund-code', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const data = await userCenterService.setFundCode(req.p2pUser, {
        fundCode: req.body?.fundCode
      });
      return res.json({ success: true, ...data });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/security/login-history', requiresP2PUser, async (req, res) => {
    try {
      const items = await userCenterService.listLoginHistory(req.p2pUser);
      return res.json({ success: true, items });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/security/delete-account', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const result = await userCenterService.deleteAccount(req.p2pUser, {
        confirmation: req.body?.confirmation
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/addresses', requiresP2PUser, async (req, res) => {
    try {
      const items = await userCenterService.listAddresses(req.p2pUser);
      return res.json({ success: true, items });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/user-center/addresses', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const address = await userCenterService.addAddress(req.p2pUser, {
        coin: req.body?.coin,
        network: req.body?.network,
        address: req.body?.address,
        label: req.body?.label
      });
      return res.status(201).json({ success: true, address });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.delete('/api/user-center/addresses/:addressId', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const result = await userCenterService.deleteAddress(req.p2pUser, req.params.addressId);
      return res.json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/preferences', requiresP2PUser, async (req, res) => {
    try {
      const preferences = await userCenterService.getPreferences(req.p2pUser);
      return res.json({ success: true, preferences });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.put('/api/user-center/preferences', requiresP2PUser, async (req, res) => {
    try {
      const preferences = await userCenterService.updatePreferences(req.p2pUser, req.body || {});
      return res.json({ success: true, preferences });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/fees', requiresP2PUser, async (req, res) => {
    try {
      const fees = await userCenterService.getFees();
      return res.json({ success: true, fees });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/user-center/gifts', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const gift = await userCenterService.createGift(req.p2pUser, {
        asset: req.body?.asset,
        amount: req.body?.amount
      });
      return res.status(201).json({ success: true, gift });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/user-center/gifts/claim', requiresP2PUser, securityLimiter, async (req, res) => {
    try {
      const claim = await userCenterService.claimGift(req.p2pUser, {
        giftCode: req.body?.giftCode
      });
      return res.json({ success: true, claim });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/gifts', requiresP2PUser, async (req, res) => {
    try {
      const gifts = await userCenterService.listGifts(req.p2pUser);
      return res.json({ success: true, gifts });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/referral', requiresP2PUser, async (req, res) => {
    try {
      const referral = await userCenterService.getReferralSummary(req.p2pUser);
      return res.json({ success: true, referral });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/support/center', requiresP2PUser, async (req, res) => {
    try {
      const payload = await userCenterService.getSupportCenterPayload();
      return res.json({ success: true, ...payload });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/support/tickets', requiresP2PUser, async (req, res) => {
    try {
      const tickets = await userCenterService.listSupportTickets(req.p2pUser);
      return res.json({ success: true, tickets });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/user-center/support/tickets', requiresP2PUser, supportLimiter, async (req, res) => {
    try {
      const ticket = await userCenterService.createSupportTicket(req.p2pUser, req.body || {});
      return res.status(201).json({ success: true, ...ticket });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/support/tickets/:ticketId/messages', requiresP2PUser, async (req, res) => {
    try {
      const messages = await userCenterService.getSupportMessages(req.p2pUser, req.params.ticketId);
      return res.json({ success: true, messages });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/user-center/support/tickets/:ticketId/messages', requiresP2PUser, supportLimiter, async (req, res) => {
    try {
      const result = await userCenterService.sendSupportMessage(req.p2pUser, req.params.ticketId, req.body || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/help/articles', requiresP2PUser, async (req, res) => {
    try {
      const items = await userCenterService.listHelpArticles(req.query || {});
      return res.json({ success: true, items });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/user-center/about', requiresP2PUser, (req, res) => {
    return res.json({
      success: true,
      about: {
        name: 'Bitegit',
        version: '1.0.0',
        description: 'Bitegit User Center',
        supportEmail: 'support@bitegit.com'
      }
    });
  });
}

module.exports = {
  registerUserCenterRoutes
};
