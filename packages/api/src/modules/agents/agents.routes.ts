import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const agentsRouter = Router();

const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).default('agent123'),
  department: z.string().default('General Support'),
  role: z.enum(['ADMIN', 'SUPPORT_AGENT']).default('SUPPORT_AGENT'),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// GET /api/v1/agents
agentsRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (_req: Request, res: Response) => {
  const agents = queryAll(`
    SELECT a.*,
           (SELECT COUNT(*) FROM support_tickets t WHERE t.assigned_agent_id = a.agent_id AND t.status IN ('OPEN', 'IN_PROGRESS')) as active_tickets,
           (SELECT COUNT(*) FROM support_tickets t WHERE t.assigned_agent_id = a.agent_id AND t.status = 'RESOLVED') as resolved_tickets,
           (SELECT COUNT(*) FROM conversations c WHERE c.assigned_agent_id = a.agent_id AND c.status = 'HUMAN_HANDOFF') as active_handoffs
    FROM support_agents a
    ORDER BY a.name ASC
  `);

  sendSuccess(res, agents);
});

// GET /api/v1/agents/:id
agentsRouter.get('/:id', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const agentId = req.params.id as string;

  const agent = queryGet(`
    SELECT a.*,
           (SELECT COUNT(*) FROM support_tickets t WHERE t.assigned_agent_id = a.agent_id AND t.status IN ('OPEN', 'IN_PROGRESS')) as active_tickets,
           (SELECT COUNT(*) FROM support_tickets t WHERE t.assigned_agent_id = a.agent_id AND t.status = 'RESOLVED') as resolved_tickets,
           (SELECT COUNT(*) FROM conversations c WHERE c.assigned_agent_id = a.agent_id AND c.status = 'HUMAN_HANDOFF') as active_handoffs
    FROM support_agents a
    WHERE a.agent_id = ?
  `, agentId) as any;

  if (!agent) {
    sendError(res, 'Agent not found', 404);
    return;
  }

  sendSuccess(res, agent);
});

// POST /api/v1/agents
agentsRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(createAgentSchema), async (req: Request, res: Response) => {
  const db = getDatabase();
  const body = req.body;

  const existing = queryGet('SELECT id FROM users WHERE email = ?', body.email);
  if (existing) {
    sendError(res, 'Email already in use', 409);
    return;
  }

  const userId = `usr-${uuidv4()}`;
  const agentId = `agt-${uuidv4().substring(0, 8)}`;
  const passwordHash = await bcrypt.hash(body.password, 10);
  const now = new Date().toISOString();

  runTransaction(db, () => {
    execute(`
      INSERT INTO users (user_id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, userId, body.email, passwordHash, body.role, now);

    execute(`
      INSERT INTO support_agents (agent_id, user_id, name, email, role, status, department, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `, agentId, userId, body.name, body.email, body.role, body.department, now, now);

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, ?, 'CREATE_AGENT', 'SupportAgent', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, agentId, JSON.stringify({ email: body.email, name: body.name }), now);
  });

  const created = queryGet('SELECT * FROM support_agents WHERE agent_id = ?', agentId);
  sendSuccess(res, created, 201);
});

// PUT /api/v1/agents/:id
agentsRouter.put('/:id', authenticateJwt, requireRole('ADMIN'), validateBody(updateAgentSchema), (req: Request, res: Response) => {
  const agentId = req.params.id as string;
  const current = queryGet('SELECT * FROM support_agents WHERE agent_id = ?', agentId) as any;

  if (!current) {
    sendError(res, 'Agent not found', 404);
    return;
  }

  const body = req.body;
  execute(`
    UPDATE support_agents SET
      name = ?,
      department = ?,
      status = ?
    WHERE agent_id = ?
  `, body.name ?? current.name, body.department ?? current.department, body.status ?? current.status, agentId);

  const now = new Date().toISOString();
  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_AGENT', 'SupportAgent', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, agentId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM support_agents WHERE agent_id = ?', agentId);
  sendSuccess(res, updated);
});
