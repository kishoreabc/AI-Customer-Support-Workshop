import { Router, Request, Response } from 'express';
import { queryGet, queryAll } from '../../database/connection.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export const auditRouter = Router();

// GET /api/v1/audit-logs
auditRouter.get('/', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const actorType = typeof req.query.actorType === 'string' ? req.query.actorType.trim() : '';
  const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '25', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = 'FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (actorType) {
    baseQuery += ' AND actor_type = ?';
    params.push(actorType);
  }

  if (action) {
    baseQuery += ' AND action = ?';
    params.push(action);
  }

  if (entityType) {
    baseQuery += ' AND entity_type = ?';
    params.push(entityType);
  }

  if (search) {
    baseQuery += ' AND (action LIKE ? OR entity_id LIKE ? OR metadata LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const logs = queryAll(`
    SELECT * ${baseQuery}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const parsed = logs.map((l) => ({
    ...l,
    metadata: l.metadata ? JSON.parse(l.metadata) : null,
  }));

  sendSuccess(res, {
    items: parsed,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});
