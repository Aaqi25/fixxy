import { Router } from 'express';
import { attemptController } from './attempt.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

// Protect all attempt endpoints with authentication middleware
router.use(requireAuth);

// POST /api/attempts - Submit answer for server-authoritative evaluation and recording
router.post('/', attemptController.submitAttempt);

// GET /api/attempts/history - Get student's previous attempts
router.get('/history', attemptController.getAttemptHistory);

export const attemptRoutes = router;
