/**
 * Module 7: Mastery Controller
 * HTTP endpoint handler for Mastery Dashboard APIs.
 */

import { Request, Response, NextFunction } from 'express';
import { masteryService } from './mastery.service';

export class MasteryController {
  /**
   * GET /api/mastery
   * Returns overall learning summary and mastery metrics.
   */
  async getOverallSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      const summary = await masteryService.getOverallSummary(studentId);
      res.status(200).json({ summary });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mastery/concepts
   * Returns concept-level mastery records.
   */
  async getConceptMasteries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      const concepts = await masteryService.getConceptMasteries(studentId);
      res.status(200).json({ concepts });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mastery/activity
   * Returns recent learning activity for the authenticated student.
   */
  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const activity = await masteryService.getRecentActivity(studentId, limit);
      res.status(200).json({ activity });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mastery/insights
   * Returns deterministic learning insights derived from learning evidence.
   */
  async getLearningInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      const insights = await masteryService.getLearningInsights(studentId);
      res.status(200).json({ insights });
    } catch (err) {
      next(err);
    }
  }
}

export const masteryController = new MasteryController();
