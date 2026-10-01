import { Router, Request, Response, NextFunction } from 'express';
import { agentOrchestrator } from '../agents/orchestrator.js';
import { conversationMemory } from '../services/memory.js';
import { ChatRequestPayload } from '../../../shared/types/index.js';
import { logger } from '../utils/logger.js';

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = req.body as ChatRequestPayload;

    if (!payload) {
      res.status(400).json({ error: { message: 'Request body is required.' } });
      return;
    }

    if (!payload.message && !payload.image?.dataUrl && !payload.screenshot?.dataUrl && !payload.documentId) {
      res.status(400).json({
        error: { message: 'Must provide either a text message, image, screenshot, or document reference.' }
      });
      return;
    }

    const result = await agentOrchestrator.processTurn(payload);
    res.json(result);
  } catch (err: unknown) {
    next(err);
  }
});

chatRouter.post('/interrupt', (req: Request, res: Response): void => {
  const { conversationId } = req.body || {};
  const convId = conversationId || 'default-session';
  agentOrchestrator.cancelActiveRequest(convId);
  logger.info(`Interruption signal received for session: ${convId}`);
  res.json({ success: true, interrupted: true, conversationId: convId });
});

chatRouter.post('/reset', (req: Request, res: Response): void => {
  const { conversationId } = req.body || {};
  const convId = conversationId || 'default-session';
  conversationMemory.clear(convId);
  agentOrchestrator.cancelActiveRequest(convId);
  logger.info(`Reset session: ${convId}`);
  res.json({ success: true, reset: true });
});

chatRouter.get('/history/:conversationId', (req: Request, res: Response): void => {
  const convId = req.params.conversationId || 'default-session';
  const history = conversationMemory.getAllMessages(convId);
  res.json({ conversationId: convId, messages: history });
});
