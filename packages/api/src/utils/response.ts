import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: ApiResponse<T> = {
    data,
    error: null,
  };
  return res.status(statusCode).json(body);
}

export function sendError(res: Response, errorMessage: string, statusCode = 400): Response {
  const body: ApiResponse<null> = {
    data: null,
    error: errorMessage,
  };
  return res.status(statusCode).json(body);
}
