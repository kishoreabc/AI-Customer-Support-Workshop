import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const ticketsRouter = Router();

const createTicketSchema = z.object({
  customerId: z.string().optional(),
  conversationId: z.string().optional(),
  subject: z.string().min(1),
  description: z.string().min(1),
  category: z.string().default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

const updateTicketSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  assignedAgentId: z.string().nullable().optional(),
  internalNotes: z.string().optional(),
});

// GET /api/v1/tickets
ticketsRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = `
    FROM support_tickets t
    JOIN customer_profiles c ON t.customer_id = c.customer_id
    LEFT JOIN support_agents a ON t.assigned_agent_id = a.agent_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'CUSTOMER') {
    baseQuery += ' AND t.customer_id = ?';
    params.push(user.customerId);
  }

  if (status) {
    baseQuery += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    baseQuery += ' AND t.priority = ?';
    params.push(priority);
  }

  if (search) {
    baseQuery += ' AND (t.subject LIKE ? OR t.description LIKE ? OR t.ticket_id LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const tickets = queryAll(`
    SELECT t.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email,
           a.name as assigned_agent_name, a.email as assigned_agent_email
    ${baseQuery}
    ORDER BY
      CASE t.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END,
      t.created_at DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const sanitized = tickets.map((t) => {
    if (user.role === 'CUSTOMER') {
      const { internal_notes, ...rest } = t;
      return rest;
    }
    return t;
  });

  sendSuccess(res, {
    items: sanitized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/tickets/:id
ticketsRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const ticketId = req.params.id as string;

  const ticket = queryGet(`
    SELECT t.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email,
           a.name as assigned_agent_name, a.email as assigned_agent_email
    FROM support_tickets t
    JOIN customer_profiles c ON t.customer_id = c.customer_id
    LEFT JOIN support_agents a ON t.assigned_agent_id = a.agent_id
    WHERE t.ticket_id = ?
  `, ticketId) as any;

  if (!ticket) {
    sendError(res, 'Ticket not found', 404);
    return;
  }

  if (user.role === 'CUSTOMER') {
    if (ticket.customer_id !== user.customerId) {
      sendError(res, 'Forbidden: You cannot access another customer\'s ticket', 403);
      return;
    }
    const { internal_notes, ...rest } = ticket;
    sendSuccess(res, rest);
    return;
  }

  sendSuccess(res, ticket);
});

// POST /api/v1/tickets
ticketsRouter.post('/', authenticateJwt, validateBody(createTicketSchema), (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body;

  const customerId = user.role === 'CUSTOMER' ? user.customerId : (body.customerId || user.customerId);
  if (!customerId) {
    sendError(res, 'Customer ID is required', 400);
    return;
  }

  const ticketId = `tik-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  execute(`
    INSERT INTO support_tickets (
      ticket_id, customer_id, conversation_id, subject, description,
      category, priority, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
  `, ticketId, customerId, body.conversationId || null, body.subject, body.description, body.category || 'GENERAL', body.priority || 'MEDIUM', now, now);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'CREATE_TICKET', 'SupportTicket', ?, ?, ?)
  `, `log-${uuidv4()}`, user.userId, user.role, ticketId, JSON.stringify({ subject: body.subject, priority: body.priority }), now);

  const created = queryGet('SELECT * FROM support_tickets WHERE ticket_id = ?', ticketId);
  sendSuccess(res, created, 201);
});

// PUT /api/v1/tickets/:id
ticketsRouter.put('/:id', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), validateBody(updateTicketSchema), (req: Request, res: Response) => {
  const ticketId = req.params.id as string;
  const current = queryGet('SELECT * FROM support_tickets WHERE ticket_id = ?', ticketId) as any;

  if (!current) {
    sendError(res, 'Ticket not found', 404);
    return;
  }

  const body = req.body;
  const now = new Date().toISOString();
  const resolvedAt = body.status === 'RESOLVED' || body.status === 'CLOSED' ? (current.resolved_at || now) : null;

  execute(`
    UPDATE support_tickets SET
      subject = ?,
      description = ?,
      category = ?,
      priority = ?,
      status = ?,
      assigned_agent_id = ?,
      internal_notes = ?,
      resolved_at = ?,
      updated_at = ?
    WHERE ticket_id = ?
  `, body.subject ?? current.subject, body.description ?? current.description, body.category ?? current.category, body.priority ?? current.priority, body.status ?? current.status, body.assignedAgentId !== undefined ? body.assignedAgentId : current.assigned_agent_id, body.internalNotes !== undefined ? body.internalNotes : current.internal_notes, resolvedAt, now, ticketId);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_TICKET', 'SupportTicket', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, ticketId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM support_tickets WHERE ticket_id = ?', ticketId);
  sendSuccess(res, updated);
});
