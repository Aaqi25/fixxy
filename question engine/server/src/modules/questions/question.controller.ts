import { Request, Response, NextFunction } from 'express';
import { questionService, QuestionService } from './question.service';

export class QuestionController {
  constructor(private service: QuestionService = questionService) {}

  /**
   * Start a session or get practice question: POST /api/sessions/start or GET /api/questions/practice/:conceptSlug
   */
  startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const conceptSlug = req.body?.conceptSlug || req.body?.conceptId || req.params?.conceptSlug || (req.query?.concept as string);

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }
      if (!conceptSlug) {
        res.status(400).json({ error: 'Concept identifier (conceptSlug) is required.' });
        return;
      }

      const result = await this.service.startLearningSession(studentId, conceptSlug);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/questions/practice/:conceptSlug
   */
  getPractice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const conceptSlug = req.params.conceptSlug || (req.query.conceptSlug as string) || (req.query.concept as string);

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }
      if (!conceptSlug) {
        res.status(400).json({ error: 'Concept identifier is required.' });
        return;
      }

      const result = await this.service.getPracticeQuestion(studentId, conceptSlug);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/questions/retry/:sessionId or POST /api/sessions/:sessionId/retry
   */
  getRetry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const sessionId = req.params.sessionId || (req.query.sessionId as string);

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required.' });
        return;
      }

      const result = await this.service.getRetryQuestion(studentId, sessionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/questions/transfer/:sessionId or POST /api/sessions/:sessionId/transfer
   */
  getTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const sessionId = req.params.sessionId || (req.query.sessionId as string);

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required.' });
        return;
      }

      const result = await this.service.getTransferQuestion(studentId, sessionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/sessions/:sessionId/questions/current
   */
  getCurrentSessionQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const sessionId = req.params.sessionId;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required.' });
        return;
      }

      const result = await this.service.getCurrentSessionQuestion(studentId, sessionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/questions/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        return;
      }

      const questionId = req.params.id;
      const question = await this.service.getSafeQuestionById(questionId);
      res.status(200).json({ question });
    } catch (err) {
      next(err);
    }
  };
}

export const questionController = new QuestionController();
