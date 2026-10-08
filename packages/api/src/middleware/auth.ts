import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { sendError } from '../utils/response.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  customerId?: string;
  agentId?: string;
  adminId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: Missing or invalid token', 401);
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired authentication token', 401);
  }
}
