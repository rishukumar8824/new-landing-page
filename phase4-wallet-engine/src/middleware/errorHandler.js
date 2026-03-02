import { AppError } from '../utils/appError.js';

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    data: {}
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const data = err instanceof AppError ? err.data : {};

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    data
  });
};
