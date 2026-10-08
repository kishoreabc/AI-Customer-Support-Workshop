import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { processCustomerMessage } from '../../services/ai-agent.js';

export const aiRouter = Router();

const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
});

// POST /api/v1/agent/chat (Customer AI chat)
aiRouter.post('/chat', authenticateJwt, validateBody(chatSchema), async (req: Request, res: Response) => {
  const user = req.user!;
  const customerId = user.customerId;

  if (!customerId) {
    sendError(res, 'Only customers can communicate directly with the AI customer agent', 403);
    return;
  }

  try {
    const result = await processCustomerMessage({
      conversationId: req.body.conversationId,
      customerId,
      message: req.body.message,
      userRole: user.role,
      userId: user.userId,
    });

    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to process AI chat message', 400);
  }
});
