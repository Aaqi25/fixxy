import { QuestionRepository, questionRepository } from './question.repository';
import { QuestionDto, SessionDto } from './question.types';
import { NotFoundError, ValidationError } from '../attempts/attempt.service';

export class QuestionService {
  constructor(private readonly repo: QuestionRepository = questionRepository) {}

  async getQuestionsByConcept(slug: string): Promise<QuestionDto[]> {
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      throw new ValidationError('Concept slug is required');
    }
    return this.repo.findQuestionsByConceptSlug(slug.trim().toLowerCase());
  }

  async getQuestionById(id: string): Promise<QuestionDto> {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('Question ID is required');
    }
    const q = await this.repo.findQuestionDtoById(id.trim());
    if (!q) {
      throw new NotFoundError(`Question with ID ${id} not found`);
    }
    return q;
  }

  async startSession(studentId: string, conceptId: string): Promise<SessionDto> {
    if (!studentId) {
      throw new ValidationError('Student ID is required');
    }
    if (!conceptId) {
      throw new ValidationError('Concept ID is required');
    }
    return this.repo.findOrCreateActiveSession(studentId, conceptId);
  }
}

export const questionService = new QuestionService();
