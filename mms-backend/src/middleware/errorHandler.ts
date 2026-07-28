import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof Error && { details: (err as any).details }),
      },
    });
  }

  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Record already exists',
      },
    });
  }

  if (err.code === '23503') {
    // Foreign key constraint violation
    return res.status(400).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced record not found',
      },
    });
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}
