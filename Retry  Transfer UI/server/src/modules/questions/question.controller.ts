import { Request, Response, NextFunction } from 'express';
import { questionService, QuestionService } from './question.service';

export class QuestionController {
  constructor(private readonly service: QuestionService = questionService) {}

  getQuestionsByConcept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params;
      const questions = await this.service.getQuestionsByConcept(slug);
      res.status(200).json({ questions });
    } catch (err) {
      next(err);
    }
  };

  getQuestionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const question = await this.service.getQuestionById(id);
      res.status(200).json({ question });
    } catch (err) {
      next(err);
    }
  };

  startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { conceptId } = req.body;
      const session = await this.service.startSession(studentId!, conceptId);
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  };
}

export const questionController = new QuestionController();
