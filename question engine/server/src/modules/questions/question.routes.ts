import { Router } from 'express';
import { questionController } from './question.controller';
import { requireAuth } from '../auth/auth.middleware';

// 1. Question Routes: mounted at /api/questions
export const questionRoutes = Router();

questionRoutes.use(requireAuth);

questionRoutes.get('/practice/:conceptSlug', questionController.getPractice);
questionRoutes.get('/practice', questionController.getPractice);
questionRoutes.get('/retry/:sessionId', questionController.getRetry);
questionRoutes.get('/transfer/:sessionId', questionController.getTransfer);
questionRoutes.get('/:id', questionController.getById);

// 2. Session Routes: mounted at /api/sessions
export const sessionRoutes = Router();

sessionRoutes.use(requireAuth);

sessionRoutes.post('/start', questionController.startSession);
sessionRoutes.get('/:sessionId/questions/current', questionController.getCurrentSessionQuestion);
sessionRoutes.get('/:sessionId/retry', questionController.getRetry);
sessionRoutes.post('/:sessionId/retry', questionController.getRetry);
sessionRoutes.get('/:sessionId/transfer', questionController.getTransfer);
sessionRoutes.post('/:sessionId/transfer', questionController.getTransfer);
