import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const faqsRouter = Router();

const createFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

const updateFaqSchema = createFaqSchema.partial();

// GET /api/v1/faqs
faqsRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = 'FROM faqs WHERE 1=1';
  const params: any[] = [];

  if (user.role === 'CUSTOMER') {
    baseQuery += " AND status = 'PUBLISHED'";
  } else if (status) {
    baseQuery += ' AND status = ?';
    params.push(status);
  }

  if (category) {
    baseQuery += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    baseQuery += ' AND (question LIKE ? OR answer LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const faqs = queryAll(`
    SELECT * ${baseQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const parsed = faqs.map((f) => ({
    ...f,
    tags: f.tags ? JSON.parse(f.tags) : [],
  }));

  sendSuccess(res, {
    items: parsed,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/faqs/:id
faqsRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const faqId = req.params.id as string;
  const faq = queryGet('SELECT * FROM faqs WHERE faq_id = ?', faqId) as any;

  if (!faq) {
    sendError(res, 'FAQ not found', 404);
    return;
  }

  sendSuccess(res, {
    ...faq,
    tags: faq.tags ? JSON.parse(faq.tags) : [],
  });
});

// POST /api/v1/faqs
faqsRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(createFaqSchema), (req: Request, res: Response) => {
  const body = req.body;
  const faqId = `faq-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  execute(`
    INSERT INTO faqs (faq_id, question, answer, category, tags, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, faqId, body.question, body.answer, body.category, body.tags ? JSON.stringify(body.tags) : JSON.stringify([]), body.status || 'PUBLISHED', now, now);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'CREATE_FAQ', 'FAQ', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, faqId, JSON.stringify({ question: body.question }), now);

  const created = queryGet('SELECT * FROM faqs WHERE faq_id = ?', faqId) as any;
  sendSuccess(res, {
    ...created,
    tags: created.tags ? JSON.parse(created.tags) : [],
  }, 201);
});

// PUT /api/v1/faqs/:id
faqsRouter.put('/:id', authenticateJwt, requireRole('ADMIN'), validateBody(updateFaqSchema), (req: Request, res: Response) => {
  const faqId = req.params.id as string;
  const current = queryGet('SELECT * FROM faqs WHERE faq_id = ?', faqId) as any;

  if (!current) {
    sendError(res, 'FAQ not found', 404);
    return;
  }

  const body = req.body;
  const now = new Date().toISOString();

  execute(`
    UPDATE faqs SET
      question = ?,
      answer = ?,
      category = ?,
      tags = ?,
      status = ?,
      updated_at = ?
    WHERE faq_id = ?
  `, body.question ?? current.question, body.answer ?? current.answer, body.category ?? current.category, body.tags !== undefined ? JSON.stringify(body.tags) : current.tags, body.status ?? current.status, now, faqId);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_FAQ', 'FAQ', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, faqId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM faqs WHERE faq_id = ?', faqId) as any;
  sendSuccess(res, {
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
  });
});

// DELETE /api/v1/faqs/:id
faqsRouter.delete('/:id', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const faqId = req.params.id as string;
  const faq = queryGet('SELECT * FROM faqs WHERE faq_id = ?', faqId);

  if (!faq) {
    sendError(res, 'FAQ not found', 404);
    return;
  }

  execute('DELETE FROM faqs WHERE faq_id = ?', faqId);

  const now = new Date().toISOString();
  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'DELETE_FAQ', 'FAQ', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, faqId, JSON.stringify({ faqId }), now);

  sendSuccess(res, { message: 'FAQ deleted successfully' });
});
