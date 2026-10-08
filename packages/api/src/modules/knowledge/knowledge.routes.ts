import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { indexDocument } from '../../services/vector-store.js';

export const knowledgeRouter = Router();

const createDocSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  source: z.string().default('MANUAL'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

const updateDocSchema = createDocSchema.partial();

// GET /api/v1/knowledge
knowledgeRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = 'FROM knowledge_documents WHERE 1=1';
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
    baseQuery += ' AND (title LIKE ? OR content LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const docs = queryAll(`
    SELECT * ${baseQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const parsed = docs.map((d) => ({
    ...d,
    tags: d.tags ? JSON.parse(d.tags) : [],
  }));

  sendSuccess(res, {
    items: parsed,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/knowledge/:id
knowledgeRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = queryGet('SELECT * FROM knowledge_documents WHERE document_id = ?', docId) as any;

  if (!doc) {
    sendError(res, 'Document not found', 404);
    return;
  }

  if (req.user!.role === 'CUSTOMER' && doc.status !== 'PUBLISHED') {
    sendError(res, 'Forbidden', 403);
    return;
  }

  sendSuccess(res, {
    ...doc,
    tags: doc.tags ? JSON.parse(doc.tags) : [],
  });
});

// POST /api/v1/knowledge
knowledgeRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(createDocSchema), async (req: Request, res: Response) => {
  const body = req.body;
  const docId = `doc-kb-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  execute(`
    INSERT INTO knowledge_documents (
      document_id, title, content, category, tags, source, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, docId, body.title, body.content, body.category, body.tags ? JSON.stringify(body.tags) : JSON.stringify([]), body.source || 'MANUAL', body.status || 'PUBLISHED', req.user!.email, now, now);

  if (body.status === 'PUBLISHED') {
    await indexDocument(docId, body.content);
  }

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'CREATE_KNOWLEDGE_DOC', 'KnowledgeDocument', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, docId, JSON.stringify({ title: body.title }), now);

  const created = queryGet('SELECT * FROM knowledge_documents WHERE document_id = ?', docId) as any;
  sendSuccess(res, {
    ...created,
    tags: created.tags ? JSON.parse(created.tags) : [],
  }, 201);
});

// PUT /api/v1/knowledge/:id
knowledgeRouter.put('/:id', authenticateJwt, requireRole('ADMIN'), validateBody(updateDocSchema), async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const current = queryGet('SELECT * FROM knowledge_documents WHERE document_id = ?', docId) as any;

  if (!current) {
    sendError(res, 'Document not found', 404);
    return;
  }

  const body = req.body;
  const now = new Date().toISOString();

  execute(`
    UPDATE knowledge_documents SET
      title = ?,
      content = ?,
      category = ?,
      tags = ?,
      status = ?,
      updated_at = ?
    WHERE document_id = ?
  `, body.title ?? current.title, body.content ?? current.content, body.category ?? current.category, body.tags !== undefined ? JSON.stringify(body.tags) : current.tags, body.status ?? current.status, now, docId);

  const updatedContent = body.content ?? current.content;
  const updatedStatus = body.status ?? current.status;

  if (updatedStatus === 'PUBLISHED') {
    await indexDocument(docId, updatedContent);
  } else {
    execute('DELETE FROM document_embeddings WHERE document_id = ?', docId);
  }

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_KNOWLEDGE_DOC', 'KnowledgeDocument', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, docId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM knowledge_documents WHERE document_id = ?', docId) as any;
  sendSuccess(res, {
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
  });
});

// DELETE /api/v1/knowledge/:id
knowledgeRouter.delete('/:id', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const docId = req.params.id as string;

  execute('DELETE FROM document_embeddings WHERE document_id = ?', docId);
  execute('DELETE FROM knowledge_documents WHERE document_id = ?', docId);

  const now = new Date().toISOString();
  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'DELETE_KNOWLEDGE_DOC', 'KnowledgeDocument', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, docId, JSON.stringify({ documentId: docId }), now);

  sendSuccess(res, { message: 'Document and associated embeddings deleted' });
});

// POST /api/v1/knowledge/:id/reindex
knowledgeRouter.post('/:id/reindex', authenticateJwt, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = queryGet('SELECT * FROM knowledge_documents WHERE document_id = ?', docId) as any;

  if (!doc) {
    sendError(res, 'Document not found', 404);
    return;
  }

  const chunkCount = await indexDocument(doc.document_id, doc.content);
  sendSuccess(res, { message: `Successfully re-indexed document into ${chunkCount} chunks` });
});
