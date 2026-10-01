import { Request, Response, NextFunction } from 'express';
import { CurriculumService, curriculumService } from './curriculum.service';

export class CurriculumController {
  constructor(private service: CurriculumService = curriculumService) {}

  /**
   * GET /api/curriculum/concepts
   * Returns list of available concepts ordered by display_order.
   */
  getConcepts = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const concepts = await this.service.getConceptList();
      res.status(200).json({ concepts });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/curriculum/concepts/:slug
   * Returns concept details, prerequisites, curated content, and misconception metadata.
   */
  getConceptBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { slug } = req.params;
      const concept = await this.service.getConceptDetail(slug);

      if (!concept) {
        res.status(404).json({ message: 'Concept not found' });
        return;
      }

      res.status(200).json({ concept });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/curriculum/path
   * Returns sequence of curriculum nodes and their prerequisite relationships.
   */
  getLearningPath = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const path = await this.service.getLearningPath();
      res.status(200).json({ path });
    } catch (err) {
      next(err);
    }
  };
}

export const curriculumController = new CurriculumController();
