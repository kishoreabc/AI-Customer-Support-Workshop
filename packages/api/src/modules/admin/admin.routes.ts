import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const adminRouter = Router();

const updateAiConfigSchema = z.object({
  model: z.string().min(1).optional(),
  systemInstructions: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  ragTopK: z.number().int().positive().optional(),
  ragSimilarityThreshold: z.number().min(0).max(1).optional(),
  maxConversationHistory: z.number().int().positive().optional(),
  escalationThreshold: z.number().min(0).max(1).optional(),
  aiEnabled: z.boolean().optional(),
});

const createPromptSchema = z.object({
  content: z.string().min(10),
});

// GET /api/v1/admin/dashboard
adminRouter.get('/dashboard', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (_req: Request, res: Response) => {
  const totalSubscribers = (queryGet('SELECT COUNT(*) as count FROM customer_profiles') as any)?.count || 0;
  const activeSubscribers = (queryGet("SELECT COUNT(*) as count FROM customer_profiles WHERE customer_status = 'ACTIVE'") as any)?.count || 0;
  const activePlans = (queryGet("SELECT COUNT(*) as count FROM telecom_plans WHERE status = 'ACTIVE'") as any)?.count || 0;
  const todayRecharges = (queryGet('SELECT COUNT(*) as count FROM recharges') as any)?.count || 0;
  const rechargeRevenue = (queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM recharges WHERE status = 'SUCCESS'") as any)?.total || 0;
  const openTickets = (queryGet("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER')") as any)?.count || 0;
  const resolvedTickets = (queryGet("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('RESOLVED', 'CLOSED')") as any)?.count || 0;
  const networkIssues = (queryGet("SELECT COUNT(*) as count FROM support_tickets WHERE category = 'NETWORK' AND status != 'RESOLVED'") as any)?.count || 0;
  const activeOutages = (queryGet("SELECT COUNT(*) as count FROM network_outages WHERE status != 'RESOLVED'") as any)?.count || 0;
  const activeConversations = (queryGet("SELECT COUNT(*) as count FROM conversations WHERE status IN ('AI_ACTIVE', 'OPEN')") as any)?.count || 0;
  const escalatedConversations = (queryGet("SELECT COUNT(*) as count FROM conversations WHERE status IN ('ESCALATED', 'HUMAN_HANDOFF')") as any)?.count || 0;
  const totalAIConversations = (queryGet('SELECT COUNT(*) as count FROM conversations') as any)?.count || 0;

  const totalConv = Math.max(1, totalAIConversations);
  const humanEscalationRate = Number(((escalatedConversations / totalConv) * 100).toFixed(1));
  const aiResolutionRate = Number((100 - humanEscalationRate).toFixed(1));

  const recentTickets = queryAll(`
    SELECT t.ticket_id, t.subject, t.category, t.status, t.priority, t.created_at,
           c.first_name as customer_first_name, c.last_name as customer_last_name, c.phone_number
    FROM support_tickets t
    JOIN customer_profiles c ON t.customer_id = c.customer_id
    ORDER BY t.created_at DESC
    LIMIT 6
  `);

  const recentRecharges = queryAll(`
    SELECT r.recharge_id, r.amount, r.payment_method, r.transaction_id, r.created_at,
           c.first_name, c.last_name, c.phone_number, p.name as plan_name
    FROM recharges r
    JOIN customer_profiles c ON r.customer_id = c.customer_id
    LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
    ORDER BY r.created_at DESC
    LIMIT 6
  `);

  const activeOutagesList = queryAll(`
    SELECT outage_id, region, city, affected_service, severity, status, estimated_resolution, description
    FROM network_outages
    WHERE status != 'RESOLVED'
    ORDER BY severity DESC
    LIMIT 4
  `);

  const recentAudits = queryAll(`
    SELECT log_id, actor_type, action, entity_type, entity_id, timestamp
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 8
  `);

  sendSuccess(res, {
    metrics: {
      totalSubscribers,
      activeSubscribers,
      totalCustomers: totalSubscribers,
      activeCustomers: activeSubscribers,
      activePlans,
      todayRecharges,
      rechargeRevenue,
      openTickets,
      resolvedTickets,
      networkIssues,
      activeOutages,
      activeConversations,
      escalatedConversations,
      totalAIConversations,
      aiResolutionRate,
      humanEscalationRate,
    },
    recentTickets,
    recentRecharges,
    activeOutagesList,
    recentAudits,
  });
});

// GET /api/v1/admin/ai-config
adminRouter.get('/ai-config', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (_req: Request, res: Response) => {
  const configRow = queryGet('SELECT * FROM ai_configs ORDER BY id DESC LIMIT 1') as any;

  if (!configRow) {
    sendError(res, 'AI configuration not found', 404);
    return;
  }

  sendSuccess(res, {
    model: configRow.model,
    systemInstructions: configRow.system_instructions,
    temperature: configRow.temperature,
    maxTokens: configRow.max_tokens,
    ragTopK: configRow.rag_top_k,
    ragSimilarityThreshold: configRow.rag_similarity_threshold,
    maxConversationHistory: configRow.max_conversation_history,
    escalationThreshold: configRow.escalation_threshold,
    aiEnabled: Boolean(configRow.ai_enabled),
    updatedAt: configRow.updated_at,
  });
});

// PUT /api/v1/admin/ai-config
adminRouter.put('/ai-config', authenticateJwt, requireRole('ADMIN'), validateBody(updateAiConfigSchema), (req: Request, res: Response) => {
  const body = req.body;
  const current = queryGet('SELECT * FROM ai_configs ORDER BY id DESC LIMIT 1') as any;
  const now = new Date().toISOString();

  if (!current) {
    execute(`
      INSERT INTO ai_configs (
        model, system_instructions, temperature, max_tokens, rag_top_k,
        rag_similarity_threshold, max_conversation_history, escalation_threshold,
        ai_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, body.model || 'gpt-4o-mini', body.systemInstructions || '', body.temperature ?? 0.7, body.maxTokens ?? 1024, body.ragTopK ?? 5, body.ragSimilarityThreshold ?? 0.7, body.maxConversationHistory ?? 20, body.escalationThreshold ?? 0.8, body.aiEnabled !== undefined ? (body.aiEnabled ? 1 : 0) : 1, now);
  } else {
    execute(`
      UPDATE ai_configs SET
        model = ?,
        system_instructions = ?,
        temperature = ?,
        max_tokens = ?,
        rag_top_k = ?,
        rag_similarity_threshold = ?,
        max_conversation_history = ?,
        escalation_threshold = ?,
        ai_enabled = ?,
        updated_at = ?
      WHERE id = ?
    `, body.model ?? current.model, body.systemInstructions ?? current.system_instructions, body.temperature ?? current.temperature, body.maxTokens ?? current.max_tokens, body.ragTopK ?? current.rag_top_k, body.ragSimilarityThreshold ?? current.rag_similarity_threshold, body.maxConversationHistory ?? current.max_conversation_history, body.escalationThreshold ?? current.escalation_threshold, body.aiEnabled !== undefined ? (body.aiEnabled ? 1 : 0) : current.ai_enabled, now, current.id);
  }

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, 'ADMIN', 'UPDATE_AI_CONFIG', 'AIConfig', 'global', ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM ai_configs ORDER BY id DESC LIMIT 1') as any;
  sendSuccess(res, {
    model: updated.model,
    systemInstructions: updated.system_instructions,
    temperature: updated.temperature,
    maxTokens: updated.max_tokens,
    ragTopK: updated.rag_top_k,
    ragSimilarityThreshold: updated.rag_similarity_threshold,
    maxConversationHistory: updated.max_conversation_history,
    escalationThreshold: updated.escalation_threshold,
    aiEnabled: Boolean(updated.ai_enabled),
    updatedAt: updated.updated_at,
  });
});

// GET /api/v1/admin/ai-prompts
adminRouter.get('/ai-prompts', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (_req: Request, res: Response) => {
  const prompts = queryAll('SELECT * FROM ai_prompts ORDER BY version DESC');
  sendSuccess(res, prompts);
});

// POST /api/v1/admin/ai-prompts
adminRouter.post('/ai-prompts', authenticateJwt, requireRole('ADMIN'), validateBody(createPromptSchema), (req: Request, res: Response) => {
  const db = getDatabase();
  const { content } = req.body;
  const promptId = `prompt-v${uuidv4().substring(0, 6)}`;
  const now = new Date().toISOString();

  const maxVersionRow = queryGet('SELECT MAX(version) as max_v FROM ai_prompts') as any;
  const nextVersion = (maxVersionRow?.max_v || 0) + 1;

  runTransaction(db, () => {
    execute("UPDATE ai_prompts SET status = 'ARCHIVED' WHERE status = 'ACTIVE'");
    execute(`
      INSERT INTO ai_prompts (prompt_id, version, content, status, created_by, created_at)
      VALUES (?, ?, ?, 'ACTIVE', ?, ?)
    `, promptId, nextVersion, content, req.user!.email, now);

    execute('UPDATE ai_configs SET system_instructions = ?, updated_at = ?', content, now);

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, 'ADMIN', 'CREATE_PROMPT_VERSION', 'AIPrompt', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, promptId, JSON.stringify({ version: nextVersion }), now);
  });

  const created = queryGet('SELECT * FROM ai_prompts WHERE prompt_id = ?', promptId);
  sendSuccess(res, created, 201);
});

// PUT /api/v1/admin/ai-prompts/:id/activate
adminRouter.put('/ai-prompts/:id/activate', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const db = getDatabase();
  const promptId = req.params.id as string;
  const target = queryGet('SELECT * FROM ai_prompts WHERE prompt_id = ?', promptId) as any;

  if (!target) {
    sendError(res, 'Prompt version not found', 404);
    return;
  }

  const now = new Date().toISOString();
  runTransaction(db, () => {
    execute("UPDATE ai_prompts SET status = 'ARCHIVED' WHERE status = 'ACTIVE'");
    execute("UPDATE ai_prompts SET status = 'ACTIVE' WHERE prompt_id = ?", promptId);
    execute('UPDATE ai_configs SET system_instructions = ?, updated_at = ?', target.content, now);

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, 'ADMIN', 'ACTIVATE_PROMPT_VERSION', 'AIPrompt', ?, ?, ?)
    `, `log-${uuidv4()}`, req.user!.userId, promptId, JSON.stringify({ version: target.version }), now);
  });

  const updated = queryGet('SELECT * FROM ai_prompts WHERE prompt_id = ?', promptId);
  sendSuccess(res, updated);
});
