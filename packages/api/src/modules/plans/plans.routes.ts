import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const plansRouter = Router();

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.number().positive(),
  validityDays: z.number().int().positive(),
  dataAllowance: z.string().min(1),
  voiceAllowance: z.string().default('Unlimited Calls'),
  smsAllowance: z.string().default('100 SMS/day'),
  networkType: z.enum(['4G', '5G', 'FIBER']).default('5G'),
  is5G: z.boolean().default(true),
  roamingAvailable: z.boolean().default(true),
  category: z.string().default('UNLIMITED_5G'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

// GET /api/v1/plans (Public / Authenticated catalog)
plansRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const is5G = req.query.is5G === 'true';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let sql = 'SELECT * FROM telecom_plans WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (is5G) {
    sql += ' AND is_5g = 1';
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR data_allowance LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  // Customers only see ACTIVE plans
  if (req.user?.role === 'CUSTOMER') {
    sql += " AND status = 'ACTIVE'";
  }

  sql += ' ORDER BY price ASC';
  const plans = queryAll(sql, ...params);
  sendSuccess(res, plans);
});

// GET /api/v1/plans/:id
plansRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const plan = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', req.params.id);
  if (!plan) {
    sendError(res, 'Telecom plan not found', 404);
    return;
  }
  sendSuccess(res, plan);
});

// POST /api/v1/plans (Admin only)
plansRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(planSchema), (req: Request, res: Response) => {
  const planId = `plan-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();
  const b = req.body;

  execute(`
    INSERT INTO telecom_plans (
      plan_id, name, description, price, currency, validity_days, data_allowance,
      voice_allowance, sms_allowance, network_type, is_5g, roaming_available, category, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, planId, b.name, b.description, b.price, b.validityDays, b.dataAllowance, b.voiceAllowance, b.smsAllowance, b.networkType, b.is5G ? 1 : 0, b.roamingAvailable ? 1 : 0, b.category, b.status, now, now);

  const created = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', planId);
  sendSuccess(res, created, 201);
});

// PUT /api/v1/plans/:id (Admin only)
plansRouter.put('/:id', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const plan = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', req.params.id) as any;
  if (!plan) {
    sendError(res, 'Plan not found', 404);
    return;
  }

  const now = new Date().toISOString();
  const b = req.body;

  execute(`
    UPDATE telecom_plans SET
      name = ?, description = ?, price = ?, validity_days = ?, data_allowance = ?,
      voice_allowance = ?, sms_allowance = ?, network_type = ?, is_5g = ?,
      roaming_available = ?, category = ?, status = ?, updated_at = ?
    WHERE plan_id = ?
  `, b.name ?? plan.name, b.description ?? plan.description, b.price ?? plan.price, b.validityDays ?? plan.validity_days, b.dataAllowance ?? plan.data_allowance, b.voiceAllowance ?? plan.voice_allowance, b.smsAllowance ?? plan.sms_allowance, b.networkType ?? plan.network_type, b.is5G !== undefined ? (b.is5G ? 1 : 0) : plan.is_5g, b.roamingAvailable !== undefined ? (b.roamingAvailable ? 1 : 0) : plan.roaming_available, b.category ?? plan.category, b.status ?? plan.status, now, plan.plan_id);

  const updated = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', plan.plan_id);
  sendSuccess(res, updated);
});
