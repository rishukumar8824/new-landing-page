function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTab(raw) {
  const tab = String(raw || 'discover').trim().toLowerCase();
  if (tab === 'following' || tab === 'campaign' || tab === 'announcement') {
    return tab;
  }
  return 'discover';
}

function createSocialFeedService({ store, config = {} }) {
  if (!store) {
    throw new Error('Social feed store is required');
  }

  const defaultPageSize = Math.max(5, toInt(config.defaultPageSize, 10));
  const maxPageSize = Math.max(defaultPageSize, toInt(config.maxPageSize, 25));

  async function getFeed({ tab, page, pageSize, authUser }) {
    const normalizedTab = normalizeTab(tab);
    const safePage = Math.max(1, toInt(page, 1));
    const safePageSize = Math.max(1, Math.min(maxPageSize, toInt(pageSize, defaultPageSize)));
    const userId = await store.resolveUserId(authUser).catch(() => null);
    const data = await store.listFeed({
      tab: normalizedTab,
      page: safePage,
      pageSize: safePageSize,
      userId
    });
    return data;
  }

  async function getSuggestedCreators({ limit, authUser }) {
    const safeLimit = Math.max(1, Math.min(20, toInt(limit, 6)));
    const userId = await store.resolveUserId(authUser).catch(() => null);
    return store.listSuggestedCreators({ limit: safeLimit, userId });
  }

  async function followCreator({ authUser, creatorId }) {
    const userId = await store.resolveUserId(authUser);
    if (!userId) {
      throw createHttpError(401, 'Login required to follow creator.', 'AUTH_REQUIRED');
    }
    const safeCreatorId = toInt(creatorId);
    if (!safeCreatorId) {
      throw createHttpError(400, 'Invalid creator id.', 'CREATOR_INVALID');
    }
    return store.followCreator({
      userId,
      creatorId: safeCreatorId
    });
  }

  async function getCopyTraders({ limit }) {
    const safeLimit = Math.max(1, Math.min(30, toInt(limit, 10)));
    return store.listCopyTraders({ limit: safeLimit });
  }

  async function createAnnouncement({ title, body }) {
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();
    if (!cleanTitle || !cleanBody) {
      throw createHttpError(400, 'Announcement title and body are required.', 'ANNOUNCEMENT_INVALID');
    }
    return store.createAnnouncement({
      title: cleanTitle,
      body: cleanBody
    });
  }

  async function createCampaign({ title, body, imageUrl, startsAt, endsAt, status }) {
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();
    if (!cleanTitle || !cleanBody) {
      throw createHttpError(400, 'Campaign title and body are required.', 'CAMPAIGN_INVALID');
    }
    return store.createCampaign({
      title: cleanTitle,
      body: cleanBody,
      imageUrl: String(imageUrl || '').trim(),
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      status
    });
  }

  async function verifyCreator({ creatorId, verified }) {
    const safeCreatorId = toInt(creatorId);
    if (!safeCreatorId) {
      throw createHttpError(400, 'Invalid creator id.', 'CREATOR_INVALID');
    }
    return store.verifyCreator({
      creatorId: safeCreatorId,
      verified: Boolean(verified)
    });
  }

  async function removeSpamPost({ postId }) {
    const safePostId = toInt(postId);
    if (!safePostId) {
      throw createHttpError(400, 'Invalid post id.', 'POST_INVALID');
    }
    return store.removeSpamPost({ postId: safePostId });
  }

  async function featurePost({ postId, featured }) {
    const safePostId = toInt(postId);
    if (!safePostId) {
      throw createHttpError(400, 'Invalid post id.', 'POST_INVALID');
    }
    return store.featurePost({
      postId: safePostId,
      featured: Boolean(featured)
    });
  }

  return {
    getFeed,
    getSuggestedCreators,
    followCreator,
    getCopyTraders,
    createAnnouncement,
    createCampaign,
    verifyCreator,
    removeSpamPost,
    featurePost
  };
}

module.exports = {
  createSocialFeedService
};
