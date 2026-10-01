/**
 * Module 7: Mastery Routes
 * Maps REST endpoints for the Mastery Dashboard.
 */

import { Router } from 'express';
import { masteryController } from './mastery.controller';
import { requireAuth } from '../auth/auth.middleware';

export const masteryRoutes = Router();

// All mastery endpoints require authenticated student identity (req.user.studentId)
masteryRoutes.use(requireAuth);

// GET /api/mastery — Overall learning summary
masteryRoutes.get('/', (req, res, next) => masteryController.getOverallSummary(req, res, next));

// GET /api/mastery/concepts — Concept-level mastery
masteryRoutes.get('/concepts', (req, res, next) => masteryController.getConceptMasteries(req, res, next));

// GET /api/mastery/activity — Recent learning activity
masteryRoutes.get('/activity', (req, res, next) => masteryController.getRecentActivity(req, res, next));

// GET /api/mastery/insights — Deterministic evidence-based insights
masteryRoutes.get('/insights', (req, res, next) => masteryController.getLearningInsights(req, res, next));
