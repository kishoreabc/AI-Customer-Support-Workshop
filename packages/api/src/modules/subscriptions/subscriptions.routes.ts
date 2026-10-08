import { Router, Request, Response } from 'express';
import { queryGet, queryAll } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export const subscriptionsRouter = Router();

// GET /api/v1/subscriptions/me (Customer's active & past subscriptions)
subscriptionsRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const subs = queryAll(`
    SELECT s.*, p.name as plan_name, p.price, p.validity_days, p.data_allowance,
           p.voice_allowance, p.sms_allowance, p.is_5g
    FROM subscriptions s
    JOIN telecom_plans p ON s.plan_id = p.plan_id
    WHERE s.customer_id = ?
    ORDER BY s.activation_date DESC
  `, customerId);

  sendSuccess(res, subs);
});

// GET /api/v1/subscriptions (Admin view all subscriptions)
subscriptionsRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let sql = `
    SELECT s.*, c.first_name, c.last_name, c.email, p.name as plan_name, p.price
    FROM subscriptions s
    JOIN customer_profiles c ON s.customer_id = c.customer_id
    JOIN telecom_plans p ON s.plan_id = p.plan_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    sql += ' AND (s.mobile_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR p.name LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p);
  }

  sql += ' ORDER BY s.activation_date DESC LIMIT 50';
  const subs = queryAll(sql, ...params);
  sendSuccess(res, subs);
});
