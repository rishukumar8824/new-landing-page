CREATE DATABASE IF NOT EXISTS bitegit_phase4;
USE bitegit_phase4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  coin VARCHAR(16) NOT NULL DEFAULT 'USDT',
  available_balance DECIMAL(18,8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(18,8) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wallet_user_coin (user_id, coin),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deposits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  coin VARCHAR(16) NOT NULL DEFAULT 'USDT',
  amount DECIMAL(18,8) NOT NULL,
  tx_hash VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deposit_user (user_id),
  INDEX idx_deposit_status (status),
  CONSTRAINT fk_deposit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  coin VARCHAR(16) NOT NULL DEFAULT 'USDT',
  amount DECIMAL(18,8) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_withdrawal_user (user_id),
  INDEX idx_withdrawal_status (status),
  CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional seed admin user (password hash must be generated via bcrypt in app).
-- INSERT INTO users (email, password, role) VALUES ('admin@bitegit.com', '$2a$10$replace_with_bcrypt_hash', 'admin');
