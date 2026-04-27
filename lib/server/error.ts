import { fail } from './response';

export interface OperationalError extends Error {
  isOperational?: boolean;
  statusCode?: number;
}

export function operationalError(message: string, statusCode = 400): OperationalError {
  const e = new Error(message) as OperationalError;
  e.isOperational = true;
  e.statusCode = statusCode;
  return e;
}

export function handleError(e: unknown) {
  const err = e as any;
  if (err?.isOperational && err?.statusCode) {
    return fail(err.message, err.statusCode, err.errors);
  }
  if (err?.name === 'ValidationError') return fail(err.message || 'Validation failed', 400);
  if (err?.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    return fail(`${field} already exists`, 409);
  }
  if (err?.name === 'CastError') return fail(`Invalid ${err.path}`, 400);
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return fail('Invalid or expired token', 401);
  }
  console.error('[api error]', err);
  return fail(
    process.env.NODE_ENV === 'production' ? 'Internal server error' : (err?.message || 'Server error'),
    500,
  );
}
