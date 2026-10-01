import { Router } from 'express';
import { curriculumController } from './curriculum.controller';

const router = Router();

// GET /api/curriculum/concepts — List all active concepts ordered by display_order
router.get('/concepts', curriculumController.getConcepts);

// GET /api/curriculum/concepts/:slug — Detailed concept view with prerequisites, content, and misconceptions
router.get('/concepts/:slug', curriculumController.getConceptBySlug);

// GET /api/curriculum/path — Learning path sequence and prerequisite graph
router.get('/path', curriculumController.getLearningPath);

export const curriculumRoutes = router;
