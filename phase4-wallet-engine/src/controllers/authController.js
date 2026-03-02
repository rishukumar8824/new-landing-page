import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize } from '../config/db.js';
import { User, Wallet } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/appError.js';

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 422);
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        {
          email,
          password: hash,
          role: 'user'
        },
        { transaction }
      );

      await Wallet.create(
        {
          user_id: user.id,
          coin: 'USDT',
          available_balance: '0.00000000',
          locked_balance: '0.00000000'
        },
        { transaction }
      );

      return user;
    });

    const token = signToken(result);

    return sendSuccess(
      res,
      'Registration successful',
      {
        token,
        user: {
          id: result.id,
          email: result.email,
          role: result.role
        }
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user);

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
};
