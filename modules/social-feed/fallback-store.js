function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function normalizeTab(raw) {
  const tab = String(raw || 'discover').trim().toLowerCase();
  if (tab === 'following' || tab === 'campaign' || tab === 'announcement') {
    return tab;
  }
  return 'discover';
}

function createSeedState() {
  const now = Date.now();
  const creators = [
    {
      id: 1,
      userId: 101,
      name: 'Alpha Whale',
      avatarUrl: '',
      followersCount: 21873,
      verified: true,
      status: 'active'
    },
    {
      id: 2,
      userId: 102,
      name: 'Chain Pulse',
      avatarUrl: '',
      followersCount: 14704,
      verified: true,
      status: 'active'
    },
    {
      id: 3,
      userId: 103,
      name: 'Macro Desk',
      avatarUrl: '',
      followersCount: 9931,
      verified: false,
      status: 'active'
    },
    {
      id: 4,
      userId: 104,
      name: 'Scalp Engine',
      avatarUrl: '',
      followersCount: 7880,
      verified: false,
      status: 'active'
    }
  ];

  const posts = [
    {
      id: 1,
      userId: 101,
      tab: 'discover',
      username: 'Alpha Whale',
      avatarUrl: '',
      contentText: 'BTC breakout watch: liquidity stacked above 68k. Waiting for confirmation before adding size.',
      mediaType: 'image',
      mediaUrl: '',
      isLive: false,
      commentCount: 19,
      repostCount: 29,
      likeCount: 142,
      viewCount: 8421,
      isFeatured: true,
      isSpam: false,
      status: 'active',
      createdAt: new Date(now - 5 * 60 * 1000)
    },
    {
      id: 2,
      userId: 102,
      tab: 'discover',
      username: 'Chain Pulse',
      avatarUrl: '',
      contentText: 'ETH funding remains neutral while open interest climbs. Keeping risk reduced into CPI print.',
      mediaType: 'video',
      mediaUrl: '',
      isLive: false,
      commentCount: 7,
      repostCount: 12,
      likeCount: 68,
      viewCount: 4610,
      isFeatured: false,
      isSpam: false,
      status: 'active',
      createdAt: new Date(now - 14 * 60 * 1000)
    },
    {
      id: 3,
      userId: 103,
      tab: 'discover',
      username: 'Macro Desk',
      avatarUrl: '',
      contentText: 'Going live in 10 minutes: US session setup and rotation pairs.',
      mediaType: 'text',
      mediaUrl: '',
      isLive: true,
      commentCount: 11,
      repostCount: 18,
      likeCount: 101,
      viewCount: 11094,
      isFeatured: false,
      isSpam: false,
      status: 'active',
      createdAt: new Date(now - 32 * 60 * 1000)
    },
    {
      id: 4,
      userId: 104,
      tab: 'discover',
      username: 'Scalp Engine',
      avatarUrl: '',
      contentText: 'SUI/USDC scalping levels updated. Keep stops tight while spread widens.',
      mediaType: 'image',
      mediaUrl: '',
      isLive: false,
      commentCount: 3,
      repostCount: 7,
      likeCount: 29,
      viewCount: 2160,
      isFeatured: false,
      isSpam: false,
      status: 'active',
      createdAt: new Date(now - 58 * 60 * 1000)
    }
  ];

  const campaigns = [
    {
      id: 1,
      title: 'BITEGIT Spring Trading Arena',
      body: 'Trade futures and unlock a shared reward pool with tiered rebates.',
      imageUrl: '',
      status: 'active',
      createdAt: new Date(now - 2 * 60 * 60 * 1000)
    },
    {
      id: 2,
      title: 'P2P Zero-Fee Week',
      body: 'Complete 3 verified P2P orders and claim voucher multipliers.',
      imageUrl: '',
      status: 'active',
      createdAt: new Date(now - 5 * 60 * 60 * 1000)
    }
  ];

  const announcements = [
    {
      id: 1,
      title: 'System Upgrade Notice',
      body: 'Spot matching engine maintenance is scheduled for Sunday 02:00 UTC.',
      createdAt: new Date(now - 60 * 60 * 1000)
    },
    {
      id: 2,
      title: 'Proof-of-Reserve Refresh',
      body: 'Latest reserve snapshot has been published in the transparency center.',
      createdAt: new Date(now - 4 * 60 * 60 * 1000)
    }
  ];

  const copyTraders = [
    {
      id: 1,
      username: 'Alpha Whale',
      avatarUrl: '',
      minCopyAmount: 10,
      pnl7d: 2142.33,
      roiPercent: 38.1,
      aumValue: 930241.24,
      winRate: 82.6,
      status: 'active'
    },
    {
      id: 2,
      username: 'Chain Pulse',
      avatarUrl: '',
      minCopyAmount: 25,
      pnl7d: 1497.2,
      roiPercent: 31.7,
      aumValue: 512630.11,
      winRate: 77.5,
      status: 'active'
    },
    {
      id: 3,
      username: 'Macro Desk',
      avatarUrl: '',
      minCopyAmount: 50,
      pnl7d: 1149.09,
      roiPercent: 22.4,
      aumValue: 300440.02,
      winRate: 69.9,
      status: 'active'
    }
  ];

  return {
    creators,
    posts,
    campaigns,
    announcements,
    copyTraders,
    follows: new Set(),
    userMap: new Map(),
    nextUserId: 2000,
    nextPostId: posts.length + 1,
    nextCampaignId: campaigns.length + 1,
    nextAnnouncementId: announcements.length + 1
  };
}

function createSocialFeedFallbackStore({ logger = console } = {}) {
  const state = createSeedState();

  function followKey(userId, followsUserId) {
    return `${userId}:${followsUserId}`;
  }

  async function initialize() {
    logger.log('[social-feed] In-memory fallback store initialized');
    return true;
  }

  async function close() {
    return;
  }

  async function resolveUserId(authUser) {
    const rawId = String(authUser?.id || '').trim();
    const email = String(authUser?.email || '').trim().toLowerCase();
    if (!rawId && !email) {
      return null;
    }

    const keys = [rawId ? `id:${rawId}` : '', email ? `email:${email}` : ''].filter(Boolean);
    for (const key of keys) {
      if (state.userMap.has(key)) {
        return state.userMap.get(key);
      }
    }

    let userId = toInt(rawId, 0);
    if (!userId) {
      userId = state.nextUserId;
      state.nextUserId += 1;
    }

    for (const key of keys) {
      state.userMap.set(key, userId);
    }
    return userId;
  }

  async function listFeed({ tab, page = 1, pageSize = 10, userId = null }) {
    const normalizedTab = normalizeTab(tab);
    const safePage = Math.max(1, toInt(page, 1));
    const safePageSize = Math.max(1, Math.min(50, toInt(pageSize, 10)));
    const offset = (safePage - 1) * safePageSize;

    if (normalizedTab === 'campaign') {
      const rows = state.campaigns
        .filter((item) => String(item.status || '').toLowerCase() === 'active')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const paged = rows.slice(offset, offset + safePageSize);
      return {
        tab: normalizedTab,
        items: paged.map((row) => ({
          id: `campaign-${row.id}`,
          userId: 0,
          username: 'Bitegit Campaign',
          avatarUrl: '',
          createdAt: toIso(row.createdAt),
          contentText: String(row.body || row.title || '').trim(),
          mediaType: 'image',
          mediaUrl: String(row.imageUrl || '').trim(),
          isLive: false,
          commentCount: 0,
          repostCount: 0,
          likeCount: 0,
          viewCount: 0
        })),
        page: safePage,
        pageSize: safePageSize,
        hasMore: offset + paged.length < rows.length
      };
    }

    if (normalizedTab === 'announcement') {
      const rows = state.announcements
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const paged = rows.slice(offset, offset + safePageSize);
      return {
        tab: normalizedTab,
        items: paged.map((row) => ({
          id: `announcement-${row.id}`,
          userId: 0,
          username: 'Bitegit Official',
          avatarUrl: '',
          createdAt: toIso(row.createdAt),
          contentText: `${String(row.title || '').trim()}\n${String(row.body || '').trim()}`.trim(),
          mediaType: 'text',
          mediaUrl: '',
          isLive: false,
          commentCount: 0,
          repostCount: 0,
          likeCount: 0,
          viewCount: 0
        })),
        page: safePage,
        pageSize: safePageSize,
        hasMore: offset + paged.length < rows.length
      };
    }

    if (normalizedTab === 'following' && !toInt(userId, 0)) {
      return {
        tab: normalizedTab,
        items: [],
        page: safePage,
        pageSize: safePageSize,
        hasMore: false
      };
    }

    let rows = state.posts.filter(
      (post) =>
        String(post.status || '').toLowerCase() === 'active' &&
        !post.isSpam
    );

    if (normalizedTab === 'following') {
      const safeUserId = toInt(userId, 0);
      const followedIds = new Set(
        Array.from(state.follows)
          .map((entry) => String(entry).split(':'))
          .filter((parts) => toInt(parts[0], 0) === safeUserId)
          .map((parts) => toInt(parts[1], 0))
      );
      rows = rows.filter((post) => followedIds.has(toInt(post.userId, 0)));
    } else {
      rows = rows.sort((a, b) => {
        const aFeatured = a.isFeatured ? 1 : 0;
        const bFeatured = b.isFeatured ? 1 : 0;
        if (aFeatured !== bFeatured) {
          return bFeatured - aFeatured;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    const paged = rows.slice(offset, offset + safePageSize);
    return {
      tab: normalizedTab,
      items: paged.map((row) => ({
        id: String(row.id),
        userId: toInt(row.userId, 0),
        username: String(row.username || 'Bitegit User').trim(),
        avatarUrl: String(row.avatarUrl || '').trim(),
        createdAt: toIso(row.createdAt),
        contentText: String(row.contentText || '').trim(),
        mediaType: String(row.mediaType || 'text').trim().toLowerCase(),
        mediaUrl: String(row.mediaUrl || '').trim(),
        isLive: Boolean(row.isLive),
        commentCount: toInt(row.commentCount, 0),
        repostCount: toInt(row.repostCount, 0),
        likeCount: toInt(row.likeCount, 0),
        viewCount: toInt(row.viewCount, 0)
      })),
      page: safePage,
      pageSize: safePageSize,
      hasMore: offset + paged.length < rows.length
    };
  }

  async function listSuggestedCreators({ limit = 6, userId = null }) {
    const safeLimit = Math.max(1, Math.min(20, toInt(limit, 6)));
    const safeUserId = toInt(userId, 0);
    const rows = state.creators
      .filter((item) => String(item.status || '').toLowerCase() === 'active')
      .sort((a, b) => {
        const verifiedDelta = (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
        if (verifiedDelta !== 0) {
          return verifiedDelta;
        }
        return toInt(b.followersCount, 0) - toInt(a.followersCount, 0);
      })
      .slice(0, safeLimit);

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name || 'Creator').trim(),
      avatarUrl: String(row.avatarUrl || '').trim(),
      followersCount: toInt(row.followersCount, 0),
      verified: Boolean(row.verified),
      isFollowing: safeUserId > 0 && state.follows.has(followKey(safeUserId, toInt(row.userId, 0)))
    }));
  }

  async function followCreator({ userId, creatorId }) {
    const safeUserId = toInt(userId, 0);
    const safeCreatorId = toInt(creatorId, 0);
    if (!safeUserId || !safeCreatorId) {
      return { following: false };
    }

    const creator = state.creators.find((item) => toInt(item.id, 0) === safeCreatorId);
    if (!creator || String(creator.status || '').toLowerCase() !== 'active') {
      const error = new Error('Creator not found.');
      error.statusCode = 404;
      error.code = 'CREATOR_NOT_FOUND';
      throw error;
    }

    const key = followKey(safeUserId, toInt(creator.userId, 0));
    if (!state.follows.has(key)) {
      state.follows.add(key);
      creator.followersCount = toInt(creator.followersCount, 0) + 1;
    }

    return { following: true };
  }

  async function listCopyTraders({ limit = 10 }) {
    const safeLimit = Math.max(1, Math.min(30, toInt(limit, 10)));
    return state.copyTraders
      .filter((item) => String(item.status || '').toLowerCase() === 'active')
      .sort((a, b) => Number(b.roiPercent || 0) - Number(a.roiPercent || 0))
      .slice(0, safeLimit)
      .map((row) => ({
        id: String(row.id),
        username: String(row.username || 'Trader').trim(),
        avatarUrl: String(row.avatarUrl || '').trim(),
        minCopyAmount: Number(row.minCopyAmount || 0),
        pnl7d: Number(row.pnl7d || 0),
        roiPercent: Number(row.roiPercent || 0),
        aumValue: Number(row.aumValue || 0),
        winRate: Number(row.winRate || 0)
      }));
  }

  async function createAnnouncement({ title, body }) {
    const record = {
      id: state.nextAnnouncementId++,
      title: String(title || '').trim(),
      body: String(body || '').trim(),
      createdAt: new Date()
    };
    state.announcements.unshift(record);
    return {
      id: String(record.id),
      title: record.title,
      body: record.body
    };
  }

  async function createCampaign({ title, body, imageUrl = '', startsAt = null, endsAt = null, status = 'active' }) {
    const normalizedStatus = String(status || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
    const record = {
      id: state.nextCampaignId++,
      title: String(title || '').trim(),
      body: String(body || '').trim(),
      imageUrl: String(imageUrl || '').trim(),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      status: normalizedStatus,
      createdAt: new Date()
    };
    state.campaigns.unshift(record);
    return {
      id: String(record.id),
      title: record.title,
      body: record.body,
      status: record.status
    };
  }

  async function verifyCreator({ creatorId, verified = true }) {
    const safeCreatorId = toInt(creatorId, 0);
    const creator = state.creators.find((item) => toInt(item.id, 0) === safeCreatorId);
    if (!creator) {
      const error = new Error('Creator not found.');
      error.statusCode = 404;
      error.code = 'CREATOR_NOT_FOUND';
      throw error;
    }
    creator.verified = Boolean(verified);
    return { creatorId: String(safeCreatorId), verified: creator.verified };
  }

  async function removeSpamPost({ postId }) {
    const safePostId = toInt(postId, 0);
    const post = state.posts.find((item) => toInt(item.id, 0) === safePostId);
    if (post) {
      post.isSpam = true;
      post.status = 'removed';
    }
    return { postId: String(safePostId), removed: true };
  }

  async function featurePost({ postId, featured = true }) {
    const safePostId = toInt(postId, 0);
    const post = state.posts.find((item) => toInt(item.id, 0) === safePostId);
    if (!post) {
      const error = new Error('Post not found.');
      error.statusCode = 404;
      error.code = 'POST_NOT_FOUND';
      throw error;
    }
    post.isFeatured = Boolean(featured);
    return { postId: String(safePostId), featured: Boolean(featured) };
  }

  return {
    initialize,
    close,
    resolveUserId,
    listFeed,
    listSuggestedCreators,
    followCreator,
    listCopyTraders,
    createAnnouncement,
    createCampaign,
    verifyCreator,
    removeSpamPost,
    featurePost
  };
}

module.exports = {
  createSocialFeedFallbackStore
};
