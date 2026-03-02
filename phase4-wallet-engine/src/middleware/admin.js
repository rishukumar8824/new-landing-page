import { AppError } from '../utils/appError.js';

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  return next();
};
