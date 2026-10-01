import { Request, Response, NextFunction } from 'express';
import { attemptService, AttemptService } from './attempt.service';

export class AttemptController {
  constructor(private readonly service: AttemptService = attemptService) {}

  submitAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const result = await this.service.submitAnswer(studentId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  getAttemptHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const history = await this.service.getStudentAttempts(studentId);
      res.status(200).json({ attempts: history });
    } catch (err) {
      next(err);
    }
  };
}

export const attemptController = new AttemptController();
