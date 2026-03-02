import { AppError } from '../utils/appError.js';

export const requireFields = (fields = []) => (req, res, next) => {
  for (const field of fields) {
    const value = req.body[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return next(new AppError(`${field} is required`, 422));
    }
  }
  return next();
};

export const validateEmailField = (field = 'email') => (req, res, next) => {
  const email = String(req.body[field] || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return next(new AppError(`Invalid ${field} format`, 422));
  }

  req.body[field] = email;
  return next();
};
