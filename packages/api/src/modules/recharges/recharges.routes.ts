import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const rechargesRouter = Router();

const createRechargeSchema = z.object({
  planId: z.string().min(1),
  mobileNumber: z.string().optional(),
  paymentMethod: z.string().default('UPI'),
});

// GET /api/v1/recharges/me (Customer's recharges)
rechargesRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const list = queryAll(`
    SELECT r.*, p.name as plan_name, p.data_allowance, p.validity_days
    FROM recharges r
    LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
    WHERE r.customer_id = ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `, customerId);

  sendSuccess(res, list);
});

// POST /api/v1/recharges (Execute recharge)
rechargesRouter.post('/', authenticateJwt, validateBody(createRechargeSchema), (req: Request, res: Response) => {
  const db = getDatabase();
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Only customers can initiate recharges', 403);
    return;
  }

  const { planId, paymentMethod } = req.body;
  const plan = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', planId) as any;
  if (!plan) {
    sendError(res, 'Invalid plan selected', 404);
    return;
  }

  const customer = queryGet('SELECT phone_number FROM customer_profiles WHERE customer_id = ?', customerId) as any;
  const mobileNumber = req.body.mobileNumber || customer?.phone_number || '+91 98765 43210';

  const rechargeId = `rch-${uuidv4().substring(0, 6)}`;
  const txnId = `TXN-UPI-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + plan.validity_days * 24 * 60 * 60 * 1000).toISOString();

  runTransaction(db, () => {
    execute(`
      INSERT INTO recharges (recharge_id, customer_id, mobile_number, plan_id, amount, payment_method, transaction_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
    `, rechargeId, customerId, mobileNumber, planId, plan.price, paymentMethod, txnId, now);

    const existingSub = queryGet("SELECT subscription_id FROM subscriptions WHERE customer_id = ? AND status = 'ACTIVE'", customerId) as any;
    if (existingSub) {
      execute(`
        UPDATE subscriptions SET plan_id = ?, expiry_date = ?, updated_at = ?
        WHERE subscription_id = ?
      `, planId, expiryDate, now, existingSub.subscription_id);
    } else {
      execute(`
        INSERT INTO subscriptions (subscription_id, customer_id, plan_id, mobile_number, activation_date, expiry_date, status, auto_renew, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?)
      `, `sub-${uuidv4().substring(0, 6)}`, customerId, planId, mobileNumber, now, expiryDate, now, now);
    }

    // Reset daily data quota
    execute(`
      UPDATE telecom_usage SET data_used_gb = 0.0, data_remaining_gb = 10.0, updated_at = ?
      WHERE customer_id = ?
    `, now, customerId);

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, 'CUSTOMER', 'RECHARGE_PROCESSED', 'Recharge', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, rechargeId, JSON.stringify({ amount: plan.price, planId, txnId }), now);
  });

  const created = queryGet('SELECT * FROM recharges WHERE recharge_id = ?', rechargeId);
  sendSuccess(res, created, 201);
});

// GET /api/v1/recharges (Admin all recharges)
rechargesRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let sql = `
    SELECT r.*, c.first_name, c.last_name, c.email, p.name as plan_name
    FROM recharges r
    JOIN customer_profiles c ON r.customer_id = c.customer_id
    LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    sql += ' AND (r.mobile_number LIKE ? OR r.transaction_id LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p);
  }

  sql += ' ORDER BY r.created_at DESC LIMIT 50';
  const list = queryAll(sql, ...params);
  sendSuccess(res, list);
});
