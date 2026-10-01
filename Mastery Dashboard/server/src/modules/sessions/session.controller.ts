import { Request, Response, NextFunction } from 'express';
import { sessionService, SessionService } from './session.service';

export class SessionController {
  constructor(private readonly service: SessionService = sessionService) {}

  getSessionState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { id } = req.params;
      const session = await this.service.getSessionState(studentId, id);
      res.status(200).json({ session });
    } catch (err) {
      next(err);
    }
  };

  getSessionByConcept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { slug } = req.params;
      const session = await this.service.getOrCreateSessionForConcept(studentId, slug);
      res.status(200).json({ session });
    } catch (err) {
      next(err);
    }
  };

  advanceSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { id } = req.params;
      const { targetStage } = req.body;
      const session = await this.service.advanceSession(studentId, id, targetStage);
      res.status(200).json({ session });
    } catch (err) {
      next(err);
    }
  };

  startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      const { conceptSlug } = req.body;
      const session = await this.service.getOrCreateSessionForConcept(studentId, conceptSlug);
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  };
}

export const sessionController = new SessionController();
