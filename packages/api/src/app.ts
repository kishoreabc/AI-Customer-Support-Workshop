import express, { Express } from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { customersRouter } from './modules/customers/customers.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { ticketsRouter } from './modules/tickets/tickets.routes.js';
import { knowledgeRouter } from './modules/knowledge/knowledge.routes.js';
import { faqsRouter } from './modules/faqs/faqs.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { agentsRouter } from './modules/agents/agents.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';

// Telecom modules
import { plansRouter } from './modules/plans/plans.routes.js';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes.js';
import { rechargesRouter } from './modules/recharges/recharges.routes.js';
import { usageRouter } from './modules/usage/usage.routes.js';
import { billsRouter } from './modules/bills/bills.routes.js';
import { simsRouter } from './modules/sims/sims.routes.js';
import { networkRouter } from './modules/network/network.routes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Core Auth & Profile
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/customer', customersRouter);

  // Telecom Domain Routes
  app.use('/api/v1/plans', plansRouter);
  app.use('/api/v1/subscriptions', subscriptionsRouter);
  app.use('/api/v1/recharges', rechargesRouter);
  app.use('/api/v1/usage', usageRouter);
  app.use('/api/v1/bills', billsRouter);
  app.use('/api/v1/sims', simsRouter);
  app.use('/api/v1/network', networkRouter);

  // Support & Operations
  app.use('/api/v1/conversations', conversationsRouter);
  app.use('/api/v1/tickets', ticketsRouter);
  app.use('/api/v1/knowledge', knowledgeRouter);
  app.use('/api/v1/faqs', faqsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/agents', agentsRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/agent', aiRouter);

  // Backward-compatibility endpoints
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/orders', ordersRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
