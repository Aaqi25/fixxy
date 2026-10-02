/**
 * FIXXY Module 8 — Orchestration Routes
 * Base path: /api/learning
 */

import { Router } from 'express';
import { orchestrationController } from './orchestration.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

// Protect all orchestration endpoints with authentication middleware
router.use(requireAuth);

// POST /api/learning/sessions - Start or resume session for a concept
router.post('/sessions', orchestrationController.startSession);

// GET /api/learning/sessions/:sessionId - Restore session state on refresh
router.get('/sessions/:sessionId', orchestrationController.getSession);

// POST /api/learning/sessions/:sessionId/advance - Advance session stage
router.post('/sessions/:sessionId/advance', orchestrationController.advanceSession);

// POST /api/learning/answer - Unified learning-flow answer submission
router.post('/answer', orchestrationController.processAnswer);

// POST /api/learning/tutor/chat or /api/orchestration/tutor/chat - Interactive FIXXY Tutor chat
router.post('/tutor/chat', orchestrationController.chatWithTutor);

export const orchestrationRoutes = router;
