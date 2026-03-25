CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  external_user_id VARCHAR(64) NULL,
  email VARCHAR(255) NOT NULL,
  nickname VARCHAR(80) NOT NULL DEFAULT 'Bitegit User',
  avatar TEXT NULL,
  uid VARCHAR(32) NULL,
  vip_level VARCHAR(32) NOT NULL DEFAULT 'Non-VIP',
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
  country VARCHAR(64) NULL,
  full_name VARCHAR(120) NULL,
  id_number_masked VARCHAR(64) NULL,
  password VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  fund_code_hash VARCHAR(255) NULL,
  twofa_secret VARCHAR(255) NULL,
  twofa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  account_status VARCHAR(32) NOT NULL DEFAULT 'active',
  deleted_at DATETIME NULL,
  recovery_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_user_center_users_email (email),
  UNIQUE KEY ux_user_center_users_uid (uid),
  UNIQUE KEY ux_user_center_users_external (external_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  ip VARCHAR(64) NOT NULL,
  device VARCHAR(255) NOT NULL,
  login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_history_user_time (user_id, login_time),
  CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS withdraw_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  coin VARCHAR(16) NOT NULL,
  network VARCHAR(16) NOT NULL,
  address VARCHAR(255) NOT NULL,
  label VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_withdraw_addresses_user_created (user_id, created_at),
  CONSTRAINT fk_withdraw_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  language VARCHAR(24) NOT NULL DEFAULT 'en',
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  theme VARCHAR(16) NOT NULL DEFAULT 'dark',
  trend_colors VARCHAR(16) NOT NULL DEFAULT 'green-up',
  notifications TEXT NULL,
  push_notifications TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_user_preferences_user (user_id),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fee_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fee_type VARCHAR(24) NOT NULL,
  tier_label VARCHAR(64) NOT NULL,
  maker_fee VARCHAR(32) NOT NULL,
  taker_fee VARCHAR(32) NOT NULL,
  withdrawal_fee VARCHAR(32) NOT NULL,
  min_withdrawal VARCHAR(32) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_fee_configs_type_tier (fee_type, tier_label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crypto_gifts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creator_id BIGINT UNSIGNED NOT NULL,
  asset VARCHAR(16) NOT NULL,
  amount DECIMAL(24,8) NOT NULL,
  gift_code VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  claimed_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_crypto_gifts_code (gift_code),
  KEY idx_crypto_gifts_creator (creator_id),
  CONSTRAINT fk_crypto_gifts_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gift_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gift_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_gift_claim_once (gift_id, user_id),
  KEY idx_gift_claims_user (user_id),
  CONSTRAINT fk_gift_claims_gift FOREIGN KEY (gift_id) REFERENCES crypto_gifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_gift_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_id BIGINT UNSIGNED NOT NULL,
  referred_user VARCHAR(255) NOT NULL,
  reward_amount DECIMAL(24,8) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referrals_referrer (referrer_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  priority VARCHAR(24) NOT NULL DEFAULT 'normal',
  escalated_to_human TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_tickets_user (user_id),
  CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_type VARCHAR(24) NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_messages_ticket (ticket_id, created_at),
  CONSTRAINT fk_support_messages_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS help_articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  topic VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_help_articles_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
