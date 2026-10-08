import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export const simsRouter = Router();

// GET /api/v1/sims/me (Customer's SIM details)
simsRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const sim = queryGet('SELECT * FROM sim_cards WHERE customer_id = ? LIMIT 1', customerId);
  sendSuccess(res, sim || null);
});

// POST /api/v1/sims/convert-esim (Request eSIM conversion)
simsRouter.post('/convert-esim', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  const now = new Date().toISOString();
  execute(`
    UPDATE sim_cards
    SET sim_type = 'ESIM'
    WHERE customer_id = ?
  `, customerId);

  const qrToken = `ESIM-LPA:1$smdp.telecomone.net$${uuidv4().replace(/-/g, '').toUpperCase()}`;
  sendSuccess(res, {
    message: 'eSIM profile generated! Scan the QR code or enter activation code in device cellular settings.',
    activationCode: qrToken,
    eidStatus: 'VERIFIED',
    setupSteps: [
      'Open Settings -> Mobile Data -> Add eSIM',
      'Scan activation code on your device camera',
      'Restart device once signal bars appear',
    ],
  });
});

// POST /api/v1/sims/block (Lost device emergency block)
simsRouter.post('/block', authenticateJwt, (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    sendError(res, 'Subscriber identity missing', 403);
    return;
  }

  execute("UPDATE sim_cards SET status = 'BLOCKED' WHERE customer_id = ?", customerId);
  sendSuccess(res, {
    message: 'SIM has been emergency blocked to protect your identity and OTPs. Visit any telecom center for a replacement SIM.',
    status: 'BLOCKED',
  });
});

// GET /api/v1/sims (Admin view all SIMs)
simsRouter.get('/', authenticateJwt, requireRole('ADMIN', 'SUPPORT_AGENT'), (req: Request, res: Response) => {
  const sims = queryAll(`
    SELECT s.*, c.first_name, c.last_name, c.email
    FROM sim_cards s
    JOIN customer_profiles c ON s.customer_id = c.customer_id
    ORDER BY s.activated_at DESC
    LIMIT 50
  `);

  sendSuccess(res, sims);
});
