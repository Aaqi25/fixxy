import { questionRepository, QuestionRepository } from './question.repository';
import {
  QuestionStage,
  StudentSafeQuestionDTO,
  LearningSessionDTO,
  QuestionResponse,
} from './question.types';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class QuestionService {
  constructor(private repo: QuestionRepository = questionRepository) {}

  /**
   * Start or resume a learning session for a given concept and return the initial practice question
   */
  async startLearningSession(studentId: string, conceptSlugOrId: string): Promise<QuestionResponse> {
    if (!studentId) {
      throw new AppError('Authentication required.', 401);
    }
    if (!conceptSlugOrId) {
      throw new AppError('Concept slug or ID is required.', 400);
    }

    const concept = await this.repo.findConcept(conceptSlugOrId);
    if (!concept) {
      throw new AppError(`Concept '${conceptSlugOrId}' not found.`, 404);
    }

    // Create or retrieve existing active session
    const session = await this.repo.createOrGetActiveSession(studentId, concept.id);

    // If session already has an active current question and stage, restore it
    if (session.currentQuestionId) {
      const existingQuestion = await this.repo.findSafeQuestionById(session.currentQuestionId);
      if (existingQuestion) {
        return { question: existingQuestion, session };
      }
    }

    // Select practice question
    const usedQuestionIds = await this.repo.getUsedQuestionIdsForSession(session.id);
    const question = await this.repo.findAvailableQuestion(concept.id, 'PRACTICE', usedQuestionIds);

    if (!question) {
      throw new AppError('No practice question is currently available for this concept.', 404);
    }

    // Record usage and update session
    await this.repo.recordQuestionUsage(session.id, question.id, 'PRACTICE');
    await this.repo.updateSessionStageAndQuestion(session.id, 'PRACTICE', question.id);
    session.currentQuestionId = question.id;
    session.currentStage = 'PRACTICE';

    return { question, session };
  }

  /**
   * Get a practice question for a student and concept
   */
  async getPracticeQuestion(studentId: string, conceptSlugOrId: string): Promise<QuestionResponse> {
    return this.startLearningSession(studentId, conceptSlugOrId);
  }

  /**
   * Get a retry question for an active session
   */
  async getRetryQuestion(studentId: string, sessionId: string): Promise<QuestionResponse> {
    if (!studentId) {
      throw new AppError('Authentication required.', 401);
    }
    if (!sessionId) {
      throw new AppError('Session ID is required.', 400);
    }

    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Learning session not found.', 404);
    }

    // Verify session ownership
    if (session.studentId !== studentId) {
      throw new AppError('Access denied: You are not authorized to access this session.', 403);
    }

    if (session.status !== 'ACTIVE') {
      throw new AppError(`Session is ${session.status.toLowerCase()} and cannot accept new questions.`, 400);
    }

    const usedQuestionIds = await this.repo.getUsedQuestionIdsForSession(session.id);
    const question = await this.repo.findAvailableQuestion(session.conceptId, 'RETRY', usedQuestionIds);

    if (!question) {
      throw new AppError('No retry question is currently available for this session.', 404);
    }

    // Verify retry question differs from any previously served question
    if (usedQuestionIds.includes(question.id)) {
      throw new AppError('A unique retry question could not be selected.', 409);
    }

    // Record usage and update session
    await this.repo.recordQuestionUsage(session.id, question.id, 'RETRY');
    await this.repo.updateSessionStageAndQuestion(session.id, 'RETRY', question.id);
    session.currentQuestionId = question.id;
    session.currentStage = 'RETRY';

    return { question, session };
  }

  /**
   * Get a transfer question for an active session
   */
  async getTransferQuestion(studentId: string, sessionId: string): Promise<QuestionResponse> {
    if (!studentId) {
      throw new AppError('Authentication required.', 401);
    }
    if (!sessionId) {
      throw new AppError('Session ID is required.', 400);
    }

    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Learning session not found.', 404);
    }

    // Verify session ownership
    if (session.studentId !== studentId) {
      throw new AppError('Access denied: You are not authorized to access this session.', 403);
    }

    if (session.status !== 'ACTIVE') {
      throw new AppError(`Session is ${session.status.toLowerCase()} and cannot accept new questions.`, 400);
    }

    const usedQuestionIds = await this.repo.getUsedQuestionIdsForSession(session.id);
    const question = await this.repo.findAvailableQuestion(session.conceptId, 'TRANSFER', usedQuestionIds);

    if (!question) {
      throw new AppError('No transfer question is currently available for this session.', 404);
    }

    // Verify transfer question differs from any previously served question
    if (usedQuestionIds.includes(question.id)) {
      throw new AppError('A unique transfer question could not be selected.', 409);
    }

    // Record usage and update session
    await this.repo.recordQuestionUsage(session.id, question.id, 'TRANSFER');
    await this.repo.updateSessionStageAndQuestion(session.id, 'TRANSFER', question.id);
    session.currentQuestionId = question.id;
    session.currentStage = 'TRANSFER';

    return { question, session };
  }

  /**
   * Get the current question for an active learning session
   */
  async getCurrentSessionQuestion(studentId: string, sessionId: string): Promise<QuestionResponse> {
    if (!studentId) {
      throw new AppError('Authentication required.', 401);
    }
    if (!sessionId) {
      throw new AppError('Session ID is required.', 400);
    }

    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Learning session not found.', 404);
    }

    // Verify session ownership
    if (session.studentId !== studentId) {
      throw new AppError('Access denied: You are not authorized to access this session.', 403);
    }

    // If session has current question ID, return it
    if (session.currentQuestionId) {
      const question = await this.repo.findSafeQuestionById(session.currentQuestionId);
      if (question) {
        return { question, session };
      }
    }

    // Otherwise select the question for session's current stage
    const stage = (session.currentStage as QuestionStage) || 'PRACTICE';
    const usedIds = await this.repo.getUsedQuestionIdsForSession(session.id);
    const question = await this.repo.findAvailableQuestion(session.conceptId, stage, usedIds);

    if (!question) {
      throw new AppError(`No ${stage.toLowerCase()} question is currently available.`, 404);
    }

    await this.repo.recordQuestionUsage(session.id, question.id, stage);
    await this.repo.updateSessionStageAndQuestion(session.id, stage, question.id);
    session.currentQuestionId = question.id;

    return { question, session };
  }

  /**
   * Get safe question by ID
   */
  async getSafeQuestionById(questionId: string): Promise<StudentSafeQuestionDTO> {
    if (!questionId) {
      throw new AppError('Question ID is required.', 400);
    }

    const question = await this.repo.findSafeQuestionById(questionId);
    if (!question) {
      throw new AppError('Question not found.', 404);
    }

    return question;
  }
}

export const questionService = new QuestionService();
