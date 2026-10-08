import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const networkRouter = Router();

const createOutageSchema = z.object({
  region: z.string().min(2),
  city: z.string().min(2),
  affectedService: z.string().min(2),
  networkType: z.string().default('5G'),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).default('MAJOR'),
  status: z.enum(['INVESTIGATING', 'IDENTIFIED', 'IN_PROGRESS', 'RESOLVED']).default('INVESTIGATING'),
  estimatedResolution: z.string().min(2),
  description: z.string().min(5),
});

// GET /api/v1/network/outages (List outages)
networkRouter.get('/outages', authenticateJwt, (req: Request, res: Response) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  let sql = 'SELECT * FROM network_outages WHERE 1=1';
  const params: any[] = [];

  if (city) {
    sql += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }

  // If customer, only show active disruptions
  if (req.user?.role === 'CUSTOMER') {
    sql += " AND status != 'RESOLVED'";
  }

  sql += ' ORDER BY severity DESC, start_time DESC';
  const outages = queryAll(sql, ...params);
  sendSuccess(res, outages);
});

// POST /api/v1/network/outages (Admin create outage)
networkRouter.post('/outages', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), validateBody(createOutageSchema), (req: Request, res: Response) => {
  const outageId = `OUT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const b = req.body;

  execute(`
    INSERT INTO network_outages (
      outage_id, region, city, affected_service, network_type, severity, status, start_time, estimated_resolution, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, outageId, b.region, b.city, b.affectedService, b.networkType, b.severity, b.status, now, b.estimatedResolution, b.description, now, now);

  const created = queryGet('SELECT * FROM network_outages WHERE outage_id = ?', outageId);
  sendSuccess(res, created, 201);
});

// PUT /api/v1/network/outages/:id (Admin update outage status)
networkRouter.put('/outages/:id', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const outage = queryGet('SELECT * FROM network_outages WHERE outage_id = ?', req.params.id) as any;
  if (!outage) {
    sendError(res, 'Outage record not found', 404);
    return;
  }

  const now = new Date().toISOString();
  const { status, estimatedResolution, description } = req.body;

  execute(`
    UPDATE network_outages SET
      status = ?, estimated_resolution = ?, description = ?, updated_at = ?
    WHERE outage_id = ?
  `, status ?? outage.status, estimatedResolution ?? outage.estimated_resolution, description ?? outage.description, now, outage.outage_id);

  const updated = queryGet('SELECT * FROM network_outages WHERE outage_id = ?', outage.outage_id);
  sendSuccess(res, updated);
});

// GET /api/v1/network/coverage (5G Coverage Check)
networkRouter.get('/coverage', authenticateJwt, (req: Request, res: Response) => {
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : 'Mumbai';
  sendSuccess(res, {
    location,
    is5GCovered: true,
    bands: ['n28', 'n78', 'n258'],
    averageDownloadSpeed: '640 Mbps',
    averageUploadSpeed: '85 Mbps',
    technology: 'True 5G Standalone (SA)',
  });
});
