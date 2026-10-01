import { Router } from 'express';
import { sessionController } from './session.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

// Protect all session endpoints with authentication middleware
router.use(requireAuth);

// GET /api/sessions/concept/:slug - Get or restore active session for a concept
router.get('/concept/:slug', sessionController.getSessionByConcept);

// GET /api/sessions/:id - Get session state and stage restoration
router.get('/:id', sessionController.getSessionState);

// POST /api/sessions/:id/advance - Advance session stage (e.g. Teaching -> Retry)
router.post('/:id/advance', sessionController.advanceSession);

// POST /api/sessions/start - Start or resume session
router.post('/start', sessionController.startSession);

export const sessionRoutes = router;
