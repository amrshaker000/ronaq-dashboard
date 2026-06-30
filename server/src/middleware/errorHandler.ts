import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export function createAppError(message: string, statusCode: number): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const isOperational = 'isOperational' in err ? err.isOperational : false;

  // Log error
  if (!isOperational) {
    logger.error({ err, stack: err.stack }, 'Unhandled error');
  } else {
    logger.warn({ message: err.message, statusCode }, 'Operational error');
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    data: null,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `المسار ${req.originalUrl} غير موجود.`,
    data: null,
  });
}
