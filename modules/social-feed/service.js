const { createSocialFeedFallbackStore } = require('./fallback-store');

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

function makeSeed(value, fallback = 'social') {
  const raw = String(value || '').trim().toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function fallbackAvatarUrl(record, fallbackSeed) {
  const raw = String(record?.avatarUrl || record?.avatar_url || '').trim();
  if (raw) {
    return raw;
  }
  const seed = makeSeed(record?.username || record?.name || record?.id, fallbackSeed);
  return `https://i.pravatar.cc/120?u=${encodeURIComponent(seed)}`;
}

function fallbackMediaUrl(record, tab) {
  const raw = String(record?.mediaUrl || record?.media_url || '').trim();
  if (raw) {
    return raw;
  }
  const mediaType = String(record?.mediaType || record?.media_type || 'text')
    .trim()
    .toLowerCase();
  if (mediaType === 'text') {
    return '';
  }
  const seed = makeSeed(record?.id || record?.username || record?.name, `${tab}-media`);
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/520`;
}

function hydrateFeedItems(items, tab) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const normalized = { ...(item || {}) };
    normalized.avatarUrl = fallbackAvatarUrl(normalized, `feed-${tab}-${index + 1}`);
    normalized.mediaUrl = fallbackMediaUrl(normalized, tab);
    return normalized;
  });
}

function hydrateCreatorItems(items) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const normalized = { ...(item || {}) };
    normalized.avatarUrl = fallbackAvatarUrl(normalized, `creator-${index + 1}`);
    return normalized;
  });
}

function hydrateCopyTraders(items) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const normalized = { ...(item || {}) };
    normalized.avatarUrl = fallbackAvatarUrl(normalized, `trader-${index + 1}`);
    return normalized;
  });
}

function createSocialFeedService({ store, config = {} }) {
  if (!store) {
    throw new Error('Social feed store is required');
  }

  const resilientFallbackStore = createSocialFeedFallbackStore({
    logger: {
      log() {},
      error() {},
      warn() {}
    }
  });
  const resilientFallbackInitPromise = resilientFallbackStore
    .initialize()
    .catch(() => undefined);

  const defaultPageSize = Math.max(5, toInt(config.defaultPageSize, 10));
  const maxPageSize = Math.max(defaultPageSize, toInt(config.maxPageSize, 25));

  async function getFeed({ tab, page, pageSize, authUser }) {
    const normalizedTab = normalizeTab(tab);
    const safePage = Math.max(1, toInt(page, 1));
    const safePageSize = Math.max(1, Math.min(maxPageSize, toInt(pageSize, defaultPageSize)));
    const userId = await store.resolveUserId(authUser).catch(() => null);
    try {
      const data = await store.listFeed({
        tab: normalizedTab,
        page: safePage,
        pageSize: safePageSize,
        userId
      });
      return {
        ...(data || {}),
        tab: normalizedTab,
        items: hydrateFeedItems(data?.items, normalizedTab)
      };
    } catch (error) {
      await resilientFallbackInitPromise;
      const fallbackUserId = await resilientFallbackStore.resolveUserId(authUser).catch(() => null);
      const data = await resilientFallbackStore.listFeed({
        tab: normalizedTab,
        page: safePage,
        pageSize: safePageSize,
        userId: fallbackUserId
      });
      return {
        ...(data || {}),
        tab: normalizedTab,
        source: 'resilient-fallback',
        items: hydrateFeedItems(data?.items, normalizedTab)
      };
    }
  }

  async function getSuggestedCreators({ limit, authUser }) {
    const safeLimit = Math.max(1, Math.min(20, toInt(limit, 6)));
    const userId = await store.resolveUserId(authUser).catch(() => null);
    try {
      const items = await store.listSuggestedCreators({ limit: safeLimit, userId });
      return hydrateCreatorItems(items);
    } catch (error) {
      await resilientFallbackInitPromise;
      const fallbackUserId = await resilientFallbackStore.resolveUserId(authUser).catch(() => null);
      const items = await resilientFallbackStore.listSuggestedCreators({
        limit: safeLimit,
        userId: fallbackUserId
      });
      return hydrateCreatorItems(items);
    }
  }

  async function followCreator({ authUser, creatorId }) {
    const safeCreatorId = toInt(creatorId);
    if (!safeCreatorId) {
      throw createHttpError(400, 'Invalid creator id.', 'CREATOR_INVALID');
    }
    try {
      const userId = await store.resolveUserId(authUser);
      if (!userId) {
        throw createHttpError(401, 'Login required to follow creator.', 'AUTH_REQUIRED');
      }
      return store.followCreator({
        userId,
        creatorId: safeCreatorId
      });
    } catch (error) {
      if (Number(error?.statusCode) === 400) {
        throw error;
      }
      await resilientFallbackInitPromise;
      const fallbackUserId = await resilientFallbackStore.resolveUserId(authUser).catch(() => null);
      if (!fallbackUserId) {
        throw createHttpError(401, 'Login required to follow creator.', 'AUTH_REQUIRED');
      }
      return resilientFallbackStore.followCreator({
        userId: fallbackUserId,
        creatorId: safeCreatorId
      });
    }
  }

  async function getCopyTraders({ limit }) {
    const safeLimit = Math.max(1, Math.min(30, toInt(limit, 10)));
    try {
      const items = await store.listCopyTraders({ limit: safeLimit });
      return hydrateCopyTraders(items);
    } catch (error) {
      await resilientFallbackInitPromise;
      const items = await resilientFallbackStore.listCopyTraders({ limit: safeLimit });
      return hydrateCopyTraders(items);
    }
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
