const mysql = require('mysql2/promise');

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
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

function createSocialFeedStore(config, { logger = console } = {}) {
  const mysqlConfig = config && typeof config === 'object' ? config : {};
  const enabled = Boolean(mysqlConfig.enabled);
  let pool = null;
  let userColumns = new Set();

  function assertReady() {
    if (!enabled || !pool) {
      const error = new Error('Social Feed MySQL store is not configured');
      error.statusCode = 503;
      error.code = 'SOCIAL_FEED_STORE_DISABLED';
      throw error;
    }
  }

  async function initialize() {
    if (!enabled) {
      return false;
    }
    if (pool) {
      return true;
    }

    pool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: mysqlConfig.connectionLimit || 10,
      ssl: mysqlConfig.ssl
    });

    await pool.query('SELECT 1');
    await ensureTables();
    await refreshUserColumns();
    await seedDefaults();
    logger.log('[social-feed] MySQL store initialized');
    return true;
  }

  async function close() {
    if (!pool) {
      return;
    }
    const currentPool = pool;
    pool = null;
    await currentPool.end();
  }

  async function refreshUserColumns() {
    assertReady();
    const [rows] = await pool.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    userColumns = new Set(rows.map((row) => String(row.COLUMN_NAME || '').toLowerCase()));
  }

  async function ensureTables() {
    assertReady();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        external_user_id VARCHAR(64) NULL,
        email VARCHAR(255) NOT NULL,
        nickname VARCHAR(80) NOT NULL DEFAULT 'Bitegit User',
        avatar TEXT NULL,
        uid VARCHAR(32) NULL,
        vip_level VARCHAR(32) NOT NULL DEFAULT 'Non-VIP',
        kyc_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_social_users_email (email),
        UNIQUE KEY ux_social_users_external (external_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        tab VARCHAR(24) NOT NULL DEFAULT 'discover',
        username VARCHAR(120) NOT NULL,
        avatar_url TEXT NULL,
        content_text TEXT NULL,
        media_type VARCHAR(24) NOT NULL DEFAULT 'text',
        media_url TEXT NULL,
        is_live TINYINT(1) NOT NULL DEFAULT 0,
        repost_count INT UNSIGNED NOT NULL DEFAULT 0,
        view_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        is_spam TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_posts_tab_created (tab, created_at),
        KEY idx_posts_user_created (user_id, created_at),
        KEY idx_posts_featured (is_featured, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        post_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_post_likes_unique (post_id, user_id),
        KEY idx_post_likes_post (post_id),
        KEY idx_post_likes_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        post_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        comment_text TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_post_comments_post (post_id, created_at),
        KEY idx_post_comments_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        follows_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_followers_pair (user_id, follows_user_id),
        KEY idx_followers_user (user_id),
        KEY idx_followers_target (follows_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS creators (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(120) NOT NULL,
        avatar_url TEXT NULL,
        followers_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
        verified TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_creators_user (user_id),
        KEY idx_creators_verified (verified, followers_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS copy_traders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        username VARCHAR(120) NOT NULL,
        avatar_url TEXT NULL,
        min_copy_amount DECIMAL(24,8) NOT NULL DEFAULT 10,
        pnl_7d DECIMAL(24,8) NOT NULL DEFAULT 0,
        roi_percent DECIMAL(10,2) NOT NULL DEFAULT 0,
        aum_value DECIMAL(24,2) NOT NULL DEFAULT 0,
        win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_copy_traders_user (user_id),
        KEY idx_copy_traders_roi (roi_percent)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(180) NOT NULL,
        body TEXT NOT NULL,
        image_url TEXT NULL,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_campaigns_status_created (status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(180) NOT NULL,
        body TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  async function resolveUserId(authUser) {
    assertReady();
    const email = String(authUser?.email || '').trim().toLowerCase();
    const externalUserId = String(authUser?.id || '').trim();
    if (!email && !externalUserId) {
      return null;
    }

    let rows = [];
    if (userColumns.has('external_user_id') && externalUserId) {
      [rows] = await pool.query(
        'SELECT id FROM users WHERE external_user_id = ? OR email = ? LIMIT 1',
        [externalUserId, email]
      );
    } else if (email) {
      [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    }

    if (rows.length > 0) {
      return Number(rows[0].id);
    }

    const fallbackEmail = email || `${externalUserId || Date.now()}@local.bitegit`;
    if (userColumns.has('external_user_id')) {
      await pool.query(
        `INSERT INTO users (email, external_user_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE external_user_id = IFNULL(external_user_id, VALUES(external_user_id))`,
        [fallbackEmail, externalUserId || null]
      );
    } else {
      await pool.query(
        `INSERT INTO users (email)
         VALUES (?)
         ON DUPLICATE KEY UPDATE email = VALUES(email)`,
        [fallbackEmail]
      );
    }

    [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [fallbackEmail]);
    if (rows.length > 0) {
      return Number(rows[0].id);
    }
    return null;
  }

  async function seedDefaults() {
    assertReady();

    const seedUsers = [
      { email: 'alpha.creator@bitegit.local', nickname: 'Alpha Whale' },
      { email: 'beta.creator@bitegit.local', nickname: 'Chain Pulse' },
      { email: 'gamma.creator@bitegit.local', nickname: 'Macro Desk' },
      { email: 'delta.creator@bitegit.local', nickname: 'Scalp Engine' }
    ];

    for (const user of seedUsers) {
      await pool.query(
        `INSERT INTO users (email, nickname)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE nickname = VALUES(nickname)`,
        [user.email, user.nickname]
      );
    }

    const [userRows] = await pool.query(
      `SELECT id, email, nickname
       FROM users
       WHERE email IN (?, ?, ?, ?)`,
      seedUsers.map((item) => item.email)
    );

    const byEmail = new Map(userRows.map((row) => [String(row.email), row]));
    const creatorSeeds = [
      { email: seedUsers[0].email, avatarUrl: '', followersCount: 21873, verified: 1 },
      { email: seedUsers[1].email, avatarUrl: '', followersCount: 14704, verified: 1 },
      { email: seedUsers[2].email, avatarUrl: '', followersCount: 9931, verified: 0 },
      { email: seedUsers[3].email, avatarUrl: '', followersCount: 7880, verified: 0 }
    ];

    for (const creator of creatorSeeds) {
      const row = byEmail.get(creator.email);
      if (!row) continue;
      await pool.query(
        `INSERT INTO creators (user_id, name, avatar_url, followers_count, verified)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           avatar_url = VALUES(avatar_url),
           followers_count = GREATEST(followers_count, VALUES(followers_count)),
           verified = VALUES(verified)`,
        [row.id, row.nickname, creator.avatarUrl, creator.followersCount, creator.verified]
      );
    }

    const copyTraderSeeds = [
      {
        email: seedUsers[0].email,
        username: 'Alpha Whale',
        minCopyAmount: 10,
        pnl7d: 2142.33,
        roiPercent: 38.1,
        aumValue: 930241.24,
        winRate: 82.6
      },
      {
        email: seedUsers[1].email,
        username: 'Chain Pulse',
        minCopyAmount: 25,
        pnl7d: 1497.2,
        roiPercent: 31.7,
        aumValue: 512630.11,
        winRate: 77.5
      },
      {
        email: seedUsers[2].email,
        username: 'Macro Desk',
        minCopyAmount: 50,
        pnl7d: 1149.09,
        roiPercent: 22.4,
        aumValue: 300440.02,
        winRate: 69.9
      }
    ];

    for (const trader of copyTraderSeeds) {
      const row = byEmail.get(trader.email);
      if (!row) continue;
      await pool.query(
        `INSERT INTO copy_traders
          (user_id, username, avatar_url, min_copy_amount, pnl_7d, roi_percent, aum_value, win_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           min_copy_amount = VALUES(min_copy_amount),
           pnl_7d = VALUES(pnl_7d),
           roi_percent = VALUES(roi_percent),
           aum_value = VALUES(aum_value),
           win_rate = VALUES(win_rate)`,
        [
          row.id,
          trader.username,
          '',
          trader.minCopyAmount,
          trader.pnl7d,
          trader.roiPercent,
          trader.aumValue,
          trader.winRate
        ]
      );
    }

    const [postCountRows] = await pool.query('SELECT COUNT(*) AS total FROM posts');
    if (toInt(postCountRows?.[0]?.total) === 0) {
      const now = Date.now();
      const posts = [
        {
          email: seedUsers[0].email,
          tab: 'discover',
          username: 'Alpha Whale',
          text: 'BTC breakout watch: liquidity stacked above 68k. Waiting for confirmation before adding size.',
          mediaType: 'image',
          mediaUrl: '',
          isLive: 0,
          repostCount: 29,
          viewCount: 8421,
          isFeatured: 1,
          createdAt: new Date(now - 5 * 60 * 1000)
        },
        {
          email: seedUsers[1].email,
          tab: 'discover',
          username: 'Chain Pulse',
          text: 'ETH funding remains neutral while open interest climbs. Keeping risk reduced into CPI print.',
          mediaType: 'video',
          mediaUrl: '',
          isLive: 0,
          repostCount: 12,
          viewCount: 4610,
          isFeatured: 0,
          createdAt: new Date(now - 14 * 60 * 1000)
        },
        {
          email: seedUsers[2].email,
          tab: 'discover',
          username: 'Macro Desk',
          text: 'Going live in 10 minutes: US session setup and rotation pairs.',
          mediaType: 'text',
          mediaUrl: '',
          isLive: 1,
          repostCount: 18,
          viewCount: 11094,
          isFeatured: 0,
          createdAt: new Date(now - 32 * 60 * 1000)
        },
        {
          email: seedUsers[3].email,
          tab: 'discover',
          username: 'Scalp Engine',
          text: 'SUI/USDC scalping levels updated. Keep stops tight while spread widens.',
          mediaType: 'image',
          mediaUrl: '',
          isLive: 0,
          repostCount: 7,
          viewCount: 2160,
          isFeatured: 0,
          createdAt: new Date(now - 58 * 60 * 1000)
        }
      ];

      for (const post of posts) {
        const row = byEmail.get(post.email);
        if (!row) continue;
        await pool.query(
          `INSERT INTO posts
            (user_id, tab, username, avatar_url, content_text, media_type, media_url, is_live, repost_count, view_count, is_featured, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            post.tab,
            post.username,
            '',
            post.text,
            post.mediaType,
            post.mediaUrl,
            post.isLive,
            post.repostCount,
            post.viewCount,
            post.isFeatured,
            post.createdAt
          ]
        );
      }
    }

    const [campaignCountRows] = await pool.query('SELECT COUNT(*) AS total FROM campaigns');
    if (toInt(campaignCountRows?.[0]?.total) === 0) {
      await pool.query(
        `INSERT INTO campaigns (title, body, image_url, status)
         VALUES
         (?, ?, ?, 'active'),
         (?, ?, ?, 'active')`,
        [
          'BITEGIT Spring Trading Arena',
          'Trade futures and unlock a shared reward pool with tiered rebates.',
          '',
          'P2P Zero-Fee Week',
          'Complete 3 verified P2P orders and claim voucher multipliers.',
          ''
        ]
      );
    }

    const [announcementCountRows] = await pool.query('SELECT COUNT(*) AS total FROM announcements');
    if (toInt(announcementCountRows?.[0]?.total) === 0) {
      await pool.query(
        `INSERT INTO announcements (title, body)
         VALUES
         (?, ?),
         (?, ?)`,
        [
          'System Upgrade Notice',
          'Spot matching engine maintenance is scheduled for Sunday 02:00 UTC.',
          'Proof-of-Reserve Refresh',
          'Latest reserve snapshot has been published in the transparency center.'
        ]
      );
    }
  }

  async function listFeed({ tab, page = 1, pageSize = 10, userId = null }) {
    assertReady();
    const normalizedTab = normalizeTab(tab);
    const safePage = Math.max(1, toInt(page, 1));
    const safePageSize = Math.max(1, Math.min(50, toInt(pageSize, 10)));
    const offset = (safePage - 1) * safePageSize;

    if (normalizedTab === 'campaign') {
      const [rows] = await pool.query(
        `SELECT id, title, body, image_url, created_at
         FROM campaigns
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [safePageSize, offset]
      );
      const items = rows.map((row) => ({
        id: `campaign-${row.id}`,
        userId: 0,
        username: 'Bitegit Campaign',
        avatarUrl: '',
        createdAt: toIso(row.created_at),
        contentText: String(row.body || row.title || '').trim(),
        mediaType: 'image',
        mediaUrl: String(row.image_url || '').trim(),
        isLive: false,
        commentCount: 0,
        repostCount: 0,
        likeCount: 0,
        viewCount: 0
      }));
      return {
        tab: normalizedTab,
        items,
        page: safePage,
        pageSize: safePageSize,
        hasMore: items.length >= safePageSize
      };
    }

    if (normalizedTab === 'announcement') {
      const [rows] = await pool.query(
        `SELECT id, title, body, created_at
         FROM announcements
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [safePageSize, offset]
      );
      const items = rows.map((row) => ({
        id: `announcement-${row.id}`,
        userId: 0,
        username: 'Bitegit Official',
        avatarUrl: '',
        createdAt: toIso(row.created_at),
        contentText: `${String(row.title || '').trim()}\n${String(row.body || '').trim()}`.trim(),
        mediaType: 'text',
        mediaUrl: '',
        isLive: false,
        commentCount: 0,
        repostCount: 0,
        likeCount: 0,
        viewCount: 0
      }));
      return {
        tab: normalizedTab,
        items,
        page: safePage,
        pageSize: safePageSize,
        hasMore: items.length >= safePageSize
      };
    }

    if (normalizedTab === 'following' && !userId) {
      return {
        tab: normalizedTab,
        items: [],
        page: safePage,
        pageSize: safePageSize,
        hasMore: false
      };
    }

    const [rows] = normalizedTab === 'following'
      ? await pool.query(
          `SELECT
             p.id,
             p.user_id AS userId,
             p.username,
             p.avatar_url AS avatarUrl,
             p.content_text AS contentText,
             p.media_type AS mediaType,
             p.media_url AS mediaUrl,
             p.is_live AS isLive,
             p.repost_count AS repostCount,
             p.view_count AS viewCount,
             p.created_at AS createdAt,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS commentCount,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
           FROM posts p
           INNER JOIN followers f ON f.follows_user_id = p.user_id
           WHERE f.user_id = ? AND p.status = 'active' AND p.is_spam = 0
           ORDER BY p.created_at DESC
           LIMIT ? OFFSET ?`,
          [userId, safePageSize, offset]
        )
      : await pool.query(
          `SELECT
             p.id,
             p.user_id AS userId,
             p.username,
             p.avatar_url AS avatarUrl,
             p.content_text AS contentText,
             p.media_type AS mediaType,
             p.media_url AS mediaUrl,
             p.is_live AS isLive,
             p.repost_count AS repostCount,
             p.view_count AS viewCount,
             p.created_at AS createdAt,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS commentCount,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
           FROM posts p
           WHERE p.status = 'active' AND p.is_spam = 0
           ORDER BY p.is_featured DESC, p.created_at DESC
           LIMIT ? OFFSET ?`,
          [safePageSize, offset]
        );

    return {
      tab: normalizedTab,
      items: rows.map((row) => ({
        id: String(row.id),
        userId: toInt(row.userId),
        username: String(row.username || 'Bitegit User').trim(),
        avatarUrl: String(row.avatarUrl || '').trim(),
        createdAt: toIso(row.createdAt),
        contentText: String(row.contentText || '').trim(),
        mediaType: String(row.mediaType || 'text').trim(),
        mediaUrl: String(row.mediaUrl || '').trim(),
        isLive: Boolean(row.isLive),
        commentCount: toInt(row.commentCount),
        repostCount: toInt(row.repostCount),
        likeCount: toInt(row.likeCount),
        viewCount: toInt(row.viewCount)
      })),
      page: safePage,
      pageSize: safePageSize,
      hasMore: rows.length >= safePageSize
    };
  }

  async function listSuggestedCreators({ limit = 6 }) {
    assertReady();
    const safeLimit = Math.max(1, Math.min(20, toInt(limit, 6)));
    const [rows] = await pool.query(
      `SELECT id, name, avatar_url, followers_count, verified
       FROM creators
       WHERE status = 'active'
       ORDER BY verified DESC, followers_count DESC, id DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name || 'Creator').trim(),
      avatarUrl: String(row.avatar_url || '').trim(),
      followersCount: toInt(row.followers_count),
      verified: Boolean(row.verified)
    }));
  }

  async function followCreator({ userId, creatorId }) {
    assertReady();
    const safeUserId = toInt(userId);
    const safeCreatorId = toInt(creatorId);
    if (!safeUserId || !safeCreatorId) {
      return { following: false };
    }

    const [creatorRows] = await pool.query(
      'SELECT user_id FROM creators WHERE id = ? LIMIT 1',
      [safeCreatorId]
    );
    if (creatorRows.length === 0) {
      const error = new Error('Creator not found.');
      error.statusCode = 404;
      error.code = 'CREATOR_NOT_FOUND';
      throw error;
    }

    const followsUserId = toInt(creatorRows[0].user_id);
    const [insertResult] = await pool.query(
      `INSERT IGNORE INTO followers (user_id, follows_user_id)
       VALUES (?, ?)`,
      [safeUserId, followsUserId]
    );

    if (toInt(insertResult.affectedRows) > 0) {
      await pool.query(
        `UPDATE creators
         SET followers_count = followers_count + 1
         WHERE id = ?`,
        [safeCreatorId]
      );
    }

    return { following: true };
  }

  async function listCopyTraders({ limit = 10 }) {
    assertReady();
    const safeLimit = Math.max(1, Math.min(30, toInt(limit, 10)));
    const [rows] = await pool.query(
      `SELECT id, username, avatar_url, min_copy_amount, pnl_7d, roi_percent, aum_value, win_rate
       FROM copy_traders
       WHERE status = 'active'
       ORDER BY roi_percent DESC, pnl_7d DESC
       LIMIT ?`,
      [safeLimit]
    );

    return rows.map((row) => ({
      id: String(row.id),
      username: String(row.username || 'Trader').trim(),
      avatarUrl: String(row.avatar_url || '').trim(),
      minCopyAmount: Number(row.min_copy_amount || 0),
      pnl7d: Number(row.pnl_7d || 0),
      roiPercent: Number(row.roi_percent || 0),
      aumValue: Number(row.aum_value || 0),
      winRate: Number(row.win_rate || 0)
    }));
  }

  async function createAnnouncement({ title, body }) {
    assertReady();
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();
    const [result] = await pool.query(
      `INSERT INTO announcements (title, body)
       VALUES (?, ?)`,
      [cleanTitle, cleanBody]
    );
    return {
      id: String(result.insertId),
      title: cleanTitle,
      body: cleanBody
    };
  }

  async function createCampaign({ title, body, imageUrl = '', startsAt = null, endsAt = null, status = 'active' }) {
    assertReady();
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();
    const cleanStatus = String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
    const [result] = await pool.query(
      `INSERT INTO campaigns (title, body, image_url, starts_at, ends_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanTitle, cleanBody, String(imageUrl || '').trim(), startsAt, endsAt, cleanStatus]
    );
    return {
      id: String(result.insertId),
      title: cleanTitle,
      body: cleanBody,
      status: cleanStatus
    };
  }

  async function verifyCreator({ creatorId, verified = true }) {
    assertReady();
    const safeCreatorId = toInt(creatorId);
    await pool.query(
      `UPDATE creators
       SET verified = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [verified ? 1 : 0, safeCreatorId]
    );
    return { creatorId: String(safeCreatorId), verified: Boolean(verified) };
  }

  async function removeSpamPost({ postId }) {
    assertReady();
    const safePostId = toInt(postId);
    await pool.query(
      `UPDATE posts
       SET is_spam = 1, status = 'removed', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [safePostId]
    );
    return { postId: String(safePostId), removed: true };
  }

  async function featurePost({ postId, featured = true }) {
    assertReady();
    const safePostId = toInt(postId);
    await pool.query(
      `UPDATE posts
       SET is_featured = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [featured ? 1 : 0, safePostId]
    );
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
  createSocialFeedStore
};
