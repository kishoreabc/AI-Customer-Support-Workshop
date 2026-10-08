import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const ordersRouter = Router();

const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string(),
  shippingAddress: z.string().min(5),
  items: z.array(orderItemSchema).min(1),
  currency: z.string().default('USD'),
  estimatedDeliveryDate: z.string().optional(),
  trackingNumber: z.string().optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']).default('PAID'),
  orderStatus: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED']).default('CONFIRMED'),
});

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
  trackingNumber: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  shippingAddress: z.string().optional(),
});

// GET /api/v1/orders
ordersRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const paymentStatus = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus.trim() : '';
  const customerIdFilter = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = `
    FROM orders o
    JOIN customer_profiles c ON o.customer_id = c.customer_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'CUSTOMER') {
    baseQuery += ' AND o.customer_id = ?';
    params.push(user.customerId);
  } else if (customerIdFilter) {
    baseQuery += ' AND o.customer_id = ?';
    params.push(customerIdFilter);
  }

  if (search) {
    baseQuery += ' AND (o.order_id LIKE ? OR o.tracking_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  if (status) {
    baseQuery += ' AND o.order_status = ?';
    params.push(status);
  }

  if (paymentStatus) {
    baseQuery += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const orders = queryAll(`
    SELECT o.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
    ${baseQuery}
    ORDER BY o.order_date DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const orderIds = orders.map((o) => o.order_id);
  let itemsByOrder: Record<string, any[]> = {};

  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    const allItems = queryAll(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, ...orderIds);
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }
  }

  const enriched = orders.map((o) => ({
    ...o,
    items: itemsByOrder[o.order_id] || [],
  }));

  sendSuccess(res, {
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/orders/:id
ordersRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const orderId = req.params.id as string;

  const order = queryGet(`
    SELECT o.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
    FROM orders o
    JOIN customer_profiles c ON o.customer_id = c.customer_id
    WHERE o.order_id = ?
  `, orderId) as any;

  if (!order) {
    sendError(res, 'Order not found', 404);
    return;
  }

  if (user.role === 'CUSTOMER' && order.customer_id !== user.customerId) {
    sendError(res, 'Forbidden: You cannot access another customer\'s order', 403);
    return;
  }

  const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', orderId);

  sendSuccess(res, {
    ...order,
    items,
  });
});

// POST /api/v1/orders
ordersRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(createOrderSchema), (req: Request, res: Response) => {
  const db = getDatabase();
  const body = req.body;
  const orderId = `ord-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  const customer = queryGet('SELECT customer_id FROM customer_profiles WHERE customer_id = ?', body.customerId);
  if (!customer) {
    sendError(res, 'Customer not found', 404);
    return;
  }

  let totalAmount = 0;
  for (const item of body.items) {
    totalAmount += item.quantity * item.unitPrice;
  }

  runTransaction(db, () => {
    execute(`
      INSERT INTO orders (
        order_id, customer_id, order_date, total_amount, currency,
        payment_status, order_status, shipping_address,
        estimated_delivery_date, tracking_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, orderId, body.customerId, now, totalAmount, body.currency || 'USD', body.paymentStatus, body.orderStatus, body.shippingAddress, body.estimatedDeliveryDate || null, body.trackingNumber || null, now, now);

    for (const item of body.items) {
      const itemId = `item-${uuidv4().substring(0, 8)}`;
      execute(`
        INSERT INTO order_items (
          order_item_id, order_id, product_id, product_name, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, itemId, orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.quantity * item.unitPrice);
    }

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, ?, 'CREATE_ORDER', 'Order', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, orderId, JSON.stringify({ customerId: body.customerId, totalAmount }), now);
  });

  const created = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;
  const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', orderId);

  sendSuccess(res, {
    ...created,
    items,
  }, 201);
});

// PUT /api/v1/orders/:id/status
ordersRouter.put('/:id/status', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), validateBody(updateOrderStatusSchema), (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  const current = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;

  if (!current) {
    sendError(res, 'Order not found', 404);
    return;
  }

  const body = req.body;
  const now = new Date().toISOString();

  execute(`
    UPDATE orders SET
      order_status = ?,
      payment_status = ?,
      tracking_number = ?,
      estimated_delivery_date = ?,
      shipping_address = ?,
      updated_at = ?
    WHERE order_id = ?
  `, body.orderStatus ?? current.order_status, body.paymentStatus ?? current.payment_status, body.trackingNumber !== undefined ? body.trackingNumber : current.tracking_number, body.estimatedDeliveryDate !== undefined ? body.estimatedDeliveryDate : current.estimated_delivery_date, body.shippingAddress !== undefined ? body.shippingAddress : current.shipping_address, now, orderId);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_ORDER_STATUS', 'Order', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, orderId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;
  const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', orderId);

  sendSuccess(res, {
    ...updated,
    items,
  });
});
