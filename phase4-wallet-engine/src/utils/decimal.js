import Decimal from 'decimal.js';
import { AppError } from './appError.js';

export const toDecimal = (value) => new Decimal(value || 0);

export const assertPositiveAmount = (value, fieldName = 'amount') => {
  const d = toDecimal(value);
  if (!d.isFinite() || d.lte(0)) {
    throw new AppError(`${fieldName} must be greater than 0`, 422);
  }
  return d;
};

export const toDbValue = (value) => toDecimal(value).toFixed(8);
