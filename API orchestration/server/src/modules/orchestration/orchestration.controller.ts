/**
 * FIXXY Module 8 — Orchestration Controller
 */

import { Request, Response, NextFunction } from 'express';
import { orchestrationService, OrchestrationService } from './orchestration.service';

export class OrchestrationController {
  constructor(private readonly service: OrchestrationService = orchestrationService) {}

  /**
   * POST /api/learning/sessions
   * Start or retrieve an active learning session for a curriculum concept.
   */
  startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { conceptId, conceptSlug } = req.body || {};

      const response = await this.service.startOrGetSession(studentId, { conceptId, conceptSlug });
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/learning/sessions/:sessionId
   * Restore learning session state on refresh without restarting progress.
   */
  getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { sessionId } = req.params;

      const response = await this.service.getSessionState(studentId, sessionId);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/learning/answer
   * Primary unified learning-flow endpoint.
   * Client-supplied correctness, studentId, mastery, and state are strictly ignored.
   */
  processAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { sessionId, questionId, selectedOptionId, simulateAiFailure } = req.body || {};

      const response = await this.service.processAnswer(
        studentId,
        { sessionId, questionId, selectedOptionId },
        { simulateAiFailure: Boolean(simulateAiFailure) }
      );
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/learning/sessions/:sessionId/advance
   * Advance learning session stage (e.g. from TEACHING to RETRY).
   */
  advanceSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { sessionId } = req.params;
      const { targetStage } = req.body || {};

      const response = await this.service.advanceSession(studentId, sessionId, targetStage);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const orchestrationController = new OrchestrationController();
