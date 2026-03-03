import Decimal from 'decimal.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { assertPositiveAmount } from '../utils/decimal.js';

const MAX_DAILY_WITHDRAW_USDT = new Decimal(String(process.env.MAX_DAILY_WITHDRAW_USDT || '1000'));
const PASSWORD_CHANGE_COOLDOWN_HOURS = Math.max(
  1,
  Number.parseInt(String(process.env.PASSWORD_CHANGE_COOLDOWN_HOURS || '24'), 10) || 24
);
const WITHDRAW_STATUSES = ['pending', 'approved'];

const toUtcDayRange = (inputDate = new Date()) => {
  const date = new Date(inputDate);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const parseUserId = (userId) => {
  const normalized = Number.parseInt(String(userId || ''), 10);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new AppError('Invalid userId', 422);
  }
  return normalized;
};

const getWithdrawnToday = async (userId) => {
  const { start, end } = toUtcDayRange();

  const rows = await sequelize.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM withdrawals
     WHERE user_id = :userId
       AND coin = 'USDT'
       AND status IN (:statuses)
       AND created_at >= :start
       AND created_at < :end`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        userId,
        statuses: WITHDRAW_STATUSES,
        start,
        end
      }
    }
  );

  const totalRaw = rows?.[0]?.total ?? 0;
  return new Decimal(String(totalRaw || '0'));
};

const getPasswordChangeTimestamp = async (userId) => {
  const columnRows = await sequelize.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'users'
       AND column_name IN ('password_changed_at', 'password_updated_at', 'updated_at')
     ORDER BY FIELD(column_name, 'password_changed_at', 'password_updated_at', 'updated_at')`,
    { type: QueryTypes.SELECT }
  );

  const columnName = String(columnRows?.[0]?.column_name || '').trim();
  if (!columnName) {
    return null;
  }

  const rows = await sequelize.query(
    `SELECT ${columnName} AS changed_at
     FROM users
     WHERE id = :userId
     LIMIT 1`,
    {
      type: QueryTypes.SELECT,
      replacements: { userId }
    }
  );

  const value = rows?.[0]?.changed_at;
  if (!value) {
    return null;
  }

  const changedAt = new Date(value);
  return Number.isNaN(changedAt.getTime()) ? null : changedAt;
};

export const checkWithdrawLimit = async (userId, amount) => {
  const normalizedUserId = parseUserId(userId);
  const requestedAmount = assertPositiveAmount(amount, 'amount');

  const usedToday = await getWithdrawnToday(normalizedUserId);
  const projected = usedToday.plus(requestedAmount);

  if (projected.gt(MAX_DAILY_WITHDRAW_USDT)) {
    throw new AppError('Daily withdraw limit exceeded', 422, {
      limit: MAX_DAILY_WITHDRAW_USDT.toFixed(8),
      used_today: usedToday.toFixed(8),
      requested: requestedAmount.toFixed(8),
      remaining: Decimal.max(new Decimal(0), MAX_DAILY_WITHDRAW_USDT.minus(usedToday)).toFixed(8)
    });
  }

  return {
    allowed: true,
    limit: MAX_DAILY_WITHDRAW_USDT.toFixed(8),
    used_today: usedToday.toFixed(8),
    requested: requestedAmount.toFixed(8),
    remaining: MAX_DAILY_WITHDRAW_USDT.minus(projected).toFixed(8)
  };
};

export const checkCooldown = async (userId) => {
  const normalizedUserId = parseUserId(userId);
  const changedAt = await getPasswordChangeTimestamp(normalizedUserId);

  if (!changedAt) {
    return {
      allowed: true,
      cooldown_hours: PASSWORD_CHANGE_COOLDOWN_HOURS,
      password_changed_at: null,
      unlocks_at: null
    };
  }

  const cooldownMs = PASSWORD_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000;
  const unlocksAt = new Date(changedAt.getTime() + cooldownMs);
  const now = new Date();

  if (now < unlocksAt) {
    const remainingMs = unlocksAt.getTime() - now.getTime();
    throw new AppError('Withdraw blocked due to password change cooldown', 423, {
      password_changed_at: changedAt.toISOString(),
      unlocks_at: unlocksAt.toISOString(),
      remaining_minutes: Math.ceil(remainingMs / (60 * 1000))
    });
  }

  return {
    allowed: true,
    cooldown_hours: PASSWORD_CHANGE_COOLDOWN_HOURS,
    password_changed_at: changedAt.toISOString(),
    unlocks_at: unlocksAt.toISOString()
  };
};

export default {
  checkWithdrawLimit,
  checkCooldown
};
