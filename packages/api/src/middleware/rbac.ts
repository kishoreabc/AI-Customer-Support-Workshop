import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export function requireRole(...allowedRoles: Array<'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, `Forbidden: Role '${req.user.role}' is not authorized for this resource`, 403);
      return;
    }

    next();
  };
}

export function enforceCustomerIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  // Admin and Support Agents have operational access
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPPORT_AGENT') {
    next();
    return;
  }

  // For CUSTOMER, enforce that customerId matches their authenticated token
  if (req.user.role === 'CUSTOMER') {
    const requestedCustomerId = req.params.customerId || req.query.customerId || req.body?.customerId;
    if (requestedCustomerId && requestedCustomerId !== req.user.customerId) {
      sendError(res, 'Forbidden: You cannot access or modify another customer\'s data', 403);
      return;
    }
  }

  next();
}
