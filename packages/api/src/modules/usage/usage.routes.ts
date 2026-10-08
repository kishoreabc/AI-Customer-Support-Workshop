import { Router, Request, Response } from 'express';
import { queryGet } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export const usageRouter = Router();

// GET /api/v1/usage/me (Customer's usage)
usageRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const usage = queryGet(`
    SELECT u.*, p.name as plan_name, p.data_allowance
    FROM telecom_usage u
    LEFT JOIN subscriptions s ON u.customer_id = s.customer_id AND s.status = 'ACTIVE'
    LEFT JOIN telecom_plans p ON s.plan_id = p.plan_id
    WHERE u.customer_id = ?
    ORDER BY u.updated_at DESC
    LIMIT 1
  `, customerId) as any;

  if (!usage) {
    sendSuccess(res, {
      data_used_gb: 0,
      data_remaining_gb: 10,
      voice_used_mins: 0,
      voice_remaining_mins: -1,
      sms_used: 0,
      sms_remaining: 100,
    });
    return;
  }

  sendSuccess(res, usage);
});

// GET /api/v1/usage/:customerId (Admin inspect usage)
usageRouter.get('/:customerId', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const usage = queryGet(`
    SELECT * FROM telecom_usage
    WHERE customer_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `, req.params.customerId);

  sendSuccess(res, usage || {});
});
