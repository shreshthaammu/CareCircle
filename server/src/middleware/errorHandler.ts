import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error(`Unhandled error during request: ${req.method} ${req.url}`, err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
