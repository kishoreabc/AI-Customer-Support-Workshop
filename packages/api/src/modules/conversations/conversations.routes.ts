import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const conversationsRouter = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const assignAgentSchema = z.object({
  agentId: z.string(),
});

const escalateSchema = z.object({
  reason: z.string().default('Customer requested human support representative'),
});

// GET /api/v1/conversations
conversationsRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = `
    FROM conversations c
    JOIN customer_profiles cust ON c.customer_id = cust.customer_id
    LEFT JOIN support_agents a ON c.assigned_agent_id = a.agent_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user.role === 'CUSTOMER') {
    baseQuery += ' AND c.customer_id = ?';
    params.push(user.customerId);
  }

  if (status) {
    baseQuery += ' AND c.status = ?';
    params.push(status);
  }

  if (search) {
    baseQuery += ' AND (cust.first_name LIKE ? OR cust.last_name LIKE ? OR cust.email LIKE ? OR c.conversation_id LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const conversations = queryAll(`
    SELECT c.*, cust.first_name as customer_first_name, cust.last_name as customer_last_name, cust.email as customer_email,
           a.name as assigned_agent_name,
           (SELECT content FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.id DESC LIMIT 1) as last_message,
           (SELECT timestamp FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.id DESC LIMIT 1) as last_message_time,
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id) as message_count
    ${baseQuery}
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  sendSuccess(res, {
    items: conversations,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/conversations/:id
conversationsRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const convId = req.params.id as string;

  const conversation = queryGet(`
    SELECT c.*, cust.first_name as customer_first_name, cust.last_name as customer_last_name, cust.email as customer_email,
           a.name as assigned_agent_name, a.email as assigned_agent_email
    FROM conversations c
    JOIN customer_profiles cust ON c.customer_id = cust.customer_id
    LEFT JOIN support_agents a ON c.assigned_agent_id = a.agent_id
    WHERE c.conversation_id = ?
  `, convId) as any;

  if (!conversation) {
    sendError(res, 'Conversation not found', 404);
    return;
  }

  if (user.role === 'CUSTOMER' && conversation.customer_id !== user.customerId) {
    sendError(res, 'Forbidden: You cannot access another customer\'s conversation', 403);
    return;
  }

  const messages = queryAll(`
    SELECT message_id, conversation_id, sender_type, content, timestamp, tool_call_id, metadata
    FROM messages
    WHERE conversation_id = ?
    ORDER BY id ASC
  `, convId);

  const parsedMessages = messages.map((m) => ({
    ...m,
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
  }));

  const ticket = queryGet('SELECT * FROM support_tickets WHERE conversation_id = ?', convId);

  sendSuccess(res, {
    ...conversation,
    messages: parsedMessages,
    ticket: ticket || null,
  });
});

// POST /api/v1/conversations
conversationsRouter.post('/', authenticateJwt, (req: Request, res: Response) => {
  const db = getDatabase();
  const user = req.user!;
  const customerId = user.role === 'CUSTOMER' ? user.customerId : req.body.customerId;

  if (!customerId) {
    sendError(res, 'Customer ID is required', 400);
    return;
  }

  const convId = `conv-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  runTransaction(db, () => {
    execute(`
      INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
      VALUES (?, ?, 'AI_ACTIVE', ?, ?)
    `, convId, customerId, now, now);

    execute(`
      INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
      VALUES (?, ?, 'AI', ?, ?)
    `, `msg-${uuidv4().substring(0, 8)}`, convId, 'Hello! I am your AI Customer Support Assistant. How can I help you today with your orders, products, or technical questions?', now);
  });

  const created = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', convId);
  const messages = queryAll('SELECT * FROM messages WHERE conversation_id = ?', convId);

  sendSuccess(res, {
    ...created,
    messages,
  }, 201);
});

// POST /api/v1/conversations/:id/messages
conversationsRouter.post('/:id/messages', authenticateJwt, validateBody(sendMessageSchema), (req: Request, res: Response) => {
  const db = getDatabase();
  const user = req.user!;
  const convId = req.params.id as string;

  const conv = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', convId) as any;
  if (!conv) {
    sendError(res, 'Conversation not found', 404);
    return;
  }

  if (user.role === 'CUSTOMER' && conv.customer_id !== user.customerId) {
    sendError(res, 'Forbidden: You cannot reply in another customer\'s conversation', 403);
    return;
  }

  const { content } = req.body;
  const msgId = `msg-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();
  const senderType = user.role === 'CUSTOMER' ? 'CUSTOMER' : 'HUMAN_AGENT';

  runTransaction(db, () => {
    execute(`
      INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, msgId, convId, senderType, content, now);

    let newStatus = conv.status;
    if (senderType === 'HUMAN_AGENT') {
      newStatus = 'HUMAN_HANDOFF';
    } else if (senderType === 'CUSTOMER' && conv.status === 'WAITING_FOR_CUSTOMER') {
      newStatus = conv.assigned_agent_id ? 'HUMAN_HANDOFF' : 'AI_ACTIVE';
    }

    execute('UPDATE conversations SET status = ?, updated_at = ? WHERE conversation_id = ?', newStatus, now, convId);
  });

  const message = queryGet('SELECT * FROM messages WHERE message_id = ?', msgId);
  sendSuccess(res, message, 201);
});

// POST /api/v1/conversations/:id/escalate
conversationsRouter.post('/:id/escalate', authenticateJwt, validateBody(escalateSchema), (req: Request, res: Response) => {
  const db = getDatabase();
  const user = req.user!;
  const convId = req.params.id as string;

  const conv = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', convId) as any;
  if (!conv) {
    sendError(res, 'Conversation not found', 404);
    return;
  }

  if (user.role === 'CUSTOMER' && conv.customer_id !== user.customerId) {
    sendError(res, 'Forbidden', 403);
    return;
  }

  const { reason } = req.body;
  const now = new Date().toISOString();
  const ticketId = `tik-${uuidv4().substring(0, 8)}`;

  const availableAgent = queryGet("SELECT agent_id FROM support_agents WHERE status = 'ACTIVE' LIMIT 1") as any;
  const assignedAgentId = availableAgent ? availableAgent.agent_id : null;

  runTransaction(db, () => {
    execute(`
      UPDATE conversations SET
        status = 'HUMAN_HANDOFF',
        escalation_reason = ?,
        assigned_agent_id = ?,
        updated_at = ?
      WHERE conversation_id = ?
    `, reason, assignedAgentId, now, convId);

    execute(`
      INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
      VALUES (?, ?, 'SYSTEM', ?, ?)
    `, `msg-${uuidv4().substring(0, 8)}`, convId, 'This conversation has been escalated to a human support agent. Our team will review your chat history and respond shortly.', now);

    execute(`
      INSERT INTO support_tickets (
        ticket_id, customer_id, conversation_id, subject, description,
        category, priority, status, assigned_agent_id, escalation_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ESCALATION', 'HIGH', 'OPEN', ?, ?, ?, ?)
    `, ticketId, conv.customer_id, convId, `Escalated Conversation #${convId.substring(0, 8)}`, reason, assignedAgentId, reason, now, now);

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, ?, 'ESCALATE_CONVERSATION', 'Conversation', ?, ?, ?)
    `, `log-${uuidv4()}`, user.userId, user.role, convId, JSON.stringify({ reason, ticketId, assignedAgentId }), now);
  });

  const updatedConv = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', convId);
  sendSuccess(res, {
    conversation: updatedConv,
    ticketId,
  });
});

// POST /api/v1/conversations/:id/resolve
conversationsRouter.post('/:id/resolve', authenticateJwt, (req: Request, res: Response) => {
  const convId = req.params.id as string;
  const now = new Date().toISOString();

  execute(`
    UPDATE conversations SET
      status = 'RESOLVED',
      resolved_at = ?,
      updated_at = ?
    WHERE conversation_id = ?
  `, now, now, convId);

  execute(`
    UPDATE support_tickets SET
      status = 'RESOLVED',
      resolved_at = ?,
      updated_at = ?
    WHERE conversation_id = ?
  `, now, now, convId);

  execute(`
    INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
    VALUES (?, ?, 'SYSTEM', ?, ?)
  `, `msg-${uuidv4().substring(0, 8)}`, convId, 'This support conversation has been marked as resolved. If you have additional questions, feel free to open a new conversation.', now);

  const updated = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', convId);
  sendSuccess(res, updated);
});

// POST /api/v1/conversations/:id/assign
conversationsRouter.post('/:id/assign', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), validateBody(assignAgentSchema), (req: Request, res: Response) => {
  const convId = req.params.id as string;
  const { agentId } = req.body;
  const now = new Date().toISOString();

  const agent = queryGet('SELECT agent_id, name FROM support_agents WHERE agent_id = ?', agentId) as any;
  if (!agent) {
    sendError(res, 'Support agent not found', 404);
    return;
  }

  execute(`
    UPDATE conversations SET
      assigned_agent_id = ?,
      status = 'HUMAN_HANDOFF',
      updated_at = ?
    WHERE conversation_id = ?
  `, agentId, now, convId);

  execute(`
    UPDATE support_tickets SET
      assigned_agent_id = ?,
      updated_at = ?
    WHERE conversation_id = ?
  `, agentId, now, convId);

  sendSuccess(res, { message: `Assigned conversation to ${agent.name}` });
});
