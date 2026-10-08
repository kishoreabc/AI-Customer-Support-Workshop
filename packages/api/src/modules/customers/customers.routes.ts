import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole, enforceCustomerIsolation } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const customersRouter = Router();

const createCustomerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).default('password123'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  customerStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/v1/customers
customersRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = `
    FROM customer_profiles
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    baseQuery += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (status) {
    baseQuery += ` AND customer_status = ?`;
    params.push(status);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const dataQuery = `
    SELECT customer_id, first_name, last_name, email, phone, date_of_birth,
           address, city, state, country, postal_code, customer_status,
           account_created_at, last_login_at, notes, tags
    ${baseQuery}
    ORDER BY account_created_at DESC
    LIMIT ? OFFSET ?
  `;
  const items = queryAll(dataQuery, ...params, pageSize, offset);

  const mappedItems = items.map((c) => ({
    ...c,
    tags: c.tags ? JSON.parse(c.tags) : [],
  }));

  sendSuccess(res, {
    items: mappedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/customers/:id
customersRouter.get('/:id', authenticateJwt, enforceCustomerIsolation, (req: Request, res: Response) => {
  const customerId = req.params.id as string;

  const customer = queryGet(`
    SELECT customer_id, user_id, first_name, last_name, email, phone, date_of_birth,
           address, city, state, country, postal_code, customer_status,
           account_created_at, last_login_at, notes, tags
    FROM customer_profiles
    WHERE customer_id = ?
  `, customerId) as any;

  if (!customer) {
    sendError(res, 'Customer not found', 404);
    return;
  }

  const orderCount = (queryGet('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?', customerId) as any)?.count || 0;
  const conversationCount = (queryGet('SELECT COUNT(*) as count FROM conversations WHERE customer_id = ?', customerId) as any)?.count || 0;
  const ticketCount = (queryGet('SELECT COUNT(*) as count FROM support_tickets WHERE customer_id = ?', customerId) as any)?.count || 0;

  sendSuccess(res, {
    ...customer,
    tags: customer.tags ? JSON.parse(customer.tags) : [],
    activity: {
      totalOrders: orderCount,
      totalConversations: conversationCount,
      totalTickets: ticketCount,
    },
  });
});

// POST /api/v1/customers
customersRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(createCustomerSchema), async (req: Request, res: Response) => {
  const db = getDatabase();
  const { email, password, firstName, lastName, phone, dateOfBirth, address, city, state, country, postalCode, notes, tags } = req.body;

  const existing = queryGet('SELECT id FROM users WHERE email = ?', email);
  if (existing) {
    sendError(res, 'Email already exists', 409);
    return;
  }

  const userId = `usr-${uuidv4()}`;
  const customerId = `cust-${uuidv4()}`;
  const passwordHash = await bcrypt.hash(password || 'password123', 10);
  const now = new Date().toISOString();

  runTransaction(db, () => {
    execute(`
      INSERT INTO users (user_id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'CUSTOMER', ?)
    `, userId, email, passwordHash, now);

    execute(`
      INSERT INTO customer_profiles (
        customer_id, user_id, first_name, last_name, email, phone, date_of_birth,
        address, city, state, country, postal_code, customer_status,
        account_created_at, notes, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `, customerId, userId, firstName, lastName, email, phone || null, dateOfBirth || null, address || null, city || null, state || null, country || null, postalCode || null, now, notes || null, tags ? JSON.stringify(tags) : JSON.stringify([]));

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, ?, 'CREATE_CUSTOMER', 'CustomerProfile', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, customerId, JSON.stringify({ email }), now);
  });

  const created = queryGet('SELECT * FROM customer_profiles WHERE customer_id = ?', customerId) as any;
  sendSuccess(res, {
    ...created,
    tags: created.tags ? JSON.parse(created.tags) : [],
  }, 201);
});

// PUT /api/v1/customers/:id
customersRouter.put('/:id', authenticateJwt, enforceCustomerIsolation, validateBody(updateCustomerSchema), (req: Request, res: Response) => {
  const customerId = req.params.id as string;
  const current = queryGet('SELECT * FROM customer_profiles WHERE customer_id = ?', customerId) as any;

  if (!current) {
    sendError(res, 'Customer not found', 404);
    return;
  }

  const user = req.user!;
  const body = req.body;

  const updatedStatus = user.role === 'ADMIN' ? (body.customerStatus || current.customer_status) : current.customer_status;
  const updatedNotes = user.role === 'ADMIN' || user.role === 'SUPPORT_AGENT' ? (body.notes !== undefined ? body.notes : current.notes) : current.notes;
  const updatedTags = user.role === 'ADMIN' || user.role === 'SUPPORT_AGENT' ? (body.tags ? JSON.stringify(body.tags) : current.tags) : current.tags;

  execute(`
    UPDATE customer_profiles SET
      first_name = ?,
      last_name = ?,
      phone = ?,
      date_of_birth = ?,
      address = ?,
      city = ?,
      state = ?,
      country = ?,
      postal_code = ?,
      customer_status = ?,
      notes = ?,
      tags = ?
    WHERE customer_id = ?
  `, body.firstName ?? current.first_name, body.lastName ?? current.last_name, body.phone !== undefined ? body.phone : current.phone, body.dateOfBirth !== undefined ? body.dateOfBirth : current.date_of_birth, body.address !== undefined ? body.address : current.address, body.city !== undefined ? body.city : current.city, body.state !== undefined ? body.state : current.state, body.country !== undefined ? body.country : current.country, body.postalCode !== undefined ? body.postalCode : current.postal_code, updatedStatus, updatedNotes, updatedTags, customerId);

  const now = new Date().toISOString();
  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_CUSTOMER', 'CustomerProfile', ?, ?, ?)
  `, `log-${uuidv4()}`, user.userId, user.role, customerId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM customer_profiles WHERE customer_id = ?', customerId) as any;
  sendSuccess(res, {
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
  });
});

// GET /api/v1/customers/:id/orders
customersRouter.get('/:id/orders', authenticateJwt, enforceCustomerIsolation, (req: Request, res: Response) => {
  const customerId = req.params.id as string;
  const orders = queryAll('SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC', customerId);

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

  sendSuccess(res, enriched);
});

// GET /api/v1/customers/:id/conversations
customersRouter.get('/:id/conversations', authenticateJwt, enforceCustomerIsolation, (req: Request, res: Response) => {
  const customerId = req.params.id as string;
  const conversations = queryAll(`
    SELECT c.*, s.name as agent_name,
      (SELECT content FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.id DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.id DESC LIMIT 1) as last_message_time
    FROM conversations c
    LEFT JOIN support_agents s ON c.assigned_agent_id = s.agent_id
    WHERE c.customer_id = ?
    ORDER BY c.updated_at DESC
  `, customerId);

  sendSuccess(res, conversations);
});

// GET /api/v1/customers/:id/tickets
customersRouter.get('/:id/tickets', authenticateJwt, enforceCustomerIsolation, (req: Request, res: Response) => {
  const customerId = req.params.id as string;
  const tickets = queryAll(`
    SELECT t.*, s.name as agent_name
    FROM support_tickets t
    LEFT JOIN support_agents s ON t.assigned_agent_id = s.agent_id
    WHERE t.customer_id = ?
    ORDER BY t.created_at DESC
  `, customerId);

  sendSuccess(res, tickets);
});
