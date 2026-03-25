import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        ...(env.NODE_ENV === 'development' && err.details
          ? { details: err.details }
          : {}),
      },
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(env.NODE_ENV === 'development'
        ? { details: { stack: err.stack } }
        : {}),
    },
  });
}
