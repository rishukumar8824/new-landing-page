import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Authorization token missing', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
};
