import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Unhandled error at ${req.method} ${req.url}:`, {
    message: err.message,
    stack: err.stack,
  });

  sendError(res, err.message || 'Internal server error occurred', 500);
}
