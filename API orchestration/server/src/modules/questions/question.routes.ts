import { Router } from 'express';
import { questionController } from './question.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

// GET /api/questions/concept/:slug - Get active questions for a concept (Safe DTO without answer keys)
router.get('/concept/:slug', questionController.getQuestionsByConcept);

// GET /api/questions/:id - Get a specific question by ID
router.get('/:id', questionController.getQuestionById);

// POST /api/questions/session - Start or resume a learning session (requires auth)
router.post('/session', requireAuth, questionController.startSession);

export const questionRoutes = router;
