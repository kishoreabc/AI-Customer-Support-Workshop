import { Router, Request, Response } from 'express';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export const billsRouter = Router();

// GET /api/v1/bills/me (Customer's bills)
billsRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const bills = queryAll(`
    SELECT * FROM bills
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `, customerId);

  const parsed = bills.map((b: any) => ({
    ...b,
    breakdown: JSON.parse(b.breakdown_json || '{}'),
  }));

  sendSuccess(res, parsed);
});

// GET /api/v1/bills (Admin view all bills)
billsRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const bills = queryAll(`
    SELECT b.*, c.first_name, c.last_name, c.email
    FROM bills b
    JOIN customer_profiles c ON b.customer_id = c.customer_id
    ORDER BY b.created_at DESC
    LIMIT 50
  `);

  const parsed = bills.map((b: any) => ({
    ...b,
    breakdown: JSON.parse(b.breakdown_json || '{}'),
  }));

  sendSuccess(res, parsed);
});

// POST /api/v1/bills/:id/pay (Pay a bill)
billsRouter.post('/:id/pay', authenticateJwt, (req: Request, res: Response) => {
  const billId = req.params.id;
  const customerId = req.user?.customerId;

  const bill = queryGet('SELECT * FROM bills WHERE bill_id = ?', billId) as any;
  if (!bill) {
    sendError(res, 'Bill not found', 404);
    return;
  }

  if (req.user?.role === 'CUSTOMER' && bill.customer_id !== customerId) {
    sendError(res, 'Forbidden: Cannot pay bill for another subscriber', 403);
    return;
  }

  execute("UPDATE bills SET status = 'PAID' WHERE bill_id = ?", billId);
  const updated = queryGet('SELECT * FROM bills WHERE bill_id = ?', billId);
  sendSuccess(res, updated);
});
