const rateLimit = require('express-rate-limit');

function registerSocialFeedRoutes(app, {
  socialFeedService,
  requiresP2PUser,
  getP2PUserFromRequest,
  requiresAdminSession
}) {
  if (!socialFeedService) {
    app.get('/api/social/health', (req, res) => {
      res.status(503).json({
        success: false,
        message: 'Social feed service is not configured.'
      });
    });
    return;
  }

  const feedLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many feed requests. Please retry shortly.'
    }
  });

  const followLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many follow requests. Please retry later.'
    }
  });

  const adminLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 90,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many admin requests. Please retry shortly.'
    }
  });

  function sendError(res, error) {
    return res.status(Number(error?.statusCode) || 500).json({
      success: false,
      message: String(error?.message || 'Social feed operation failed.'),
      code: String(error?.code || 'SOCIAL_FEED_ERROR')
    });
  }

  async function resolveOptionalUser(req) {
    if (typeof getP2PUserFromRequest !== 'function') {
      return null;
    }
    try {
      return await getP2PUserFromRequest(req);
    } catch (error) {
      return null;
    }
  }

  app.get('/api/social/feed', feedLimiter, async (req, res) => {
    try {
      const user = await resolveOptionalUser(req);
      const feed = await socialFeedService.getFeed({
        tab: req.query?.tab,
        page: req.query?.page,
        pageSize: req.query?.pageSize,
        authUser: user
      });
      return res.json({
        success: true,
        ...feed
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/social/suggested-creators', feedLimiter, async (req, res) => {
    try {
      const items = await socialFeedService.getSuggestedCreators({
        limit: req.query?.limit
      });
      return res.json({ success: true, items });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/social/creators/:creatorId/follow', followLimiter, requiresP2PUser, async (req, res) => {
    try {
      const result = await socialFeedService.followCreator({
        authUser: req.p2pUser,
        creatorId: req.params.creatorId
      });
      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/social/copy-traders', feedLimiter, async (req, res) => {
    try {
      const items = await socialFeedService.getCopyTraders({
        limit: req.query?.limit
      });
      return res.json({ success: true, items });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/social/announcements', adminLimiter, requiresAdminSession, async (req, res) => {
    try {
      const announcement = await socialFeedService.createAnnouncement({
        title: req.body?.title,
        body: req.body?.body
      });
      return res.status(201).json({
        success: true,
        announcement
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/social/campaigns', adminLimiter, requiresAdminSession, async (req, res) => {
    try {
      const campaign = await socialFeedService.createCampaign({
        title: req.body?.title,
        body: req.body?.body,
        imageUrl: req.body?.imageUrl,
        startsAt: req.body?.startsAt,
        endsAt: req.body?.endsAt,
        status: req.body?.status
      });
      return res.status(201).json({
        success: true,
        campaign
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/social/creators/:creatorId/verify', adminLimiter, requiresAdminSession, async (req, res) => {
    try {
      const result = await socialFeedService.verifyCreator({
        creatorId: req.params.creatorId,
        verified: req.body?.verified !== false
      });
      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.delete('/api/admin/social/posts/:postId', adminLimiter, requiresAdminSession, async (req, res) => {
    try {
      const result = await socialFeedService.removeSpamPost({
        postId: req.params.postId
      });
      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post('/api/admin/social/posts/:postId/feature', adminLimiter, requiresAdminSession, async (req, res) => {
    try {
      const result = await socialFeedService.featurePost({
        postId: req.params.postId,
        featured: req.body?.featured !== false
      });
      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return sendError(res, error);
    }
  });
}

module.exports = {
  registerSocialFeedRoutes
};
